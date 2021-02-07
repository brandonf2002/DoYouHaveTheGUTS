var fs = require("fs");
var http = require("http");
var url = require("url")
var Twit = require('twit')
var config = require('./config')

var T = new Twit(config)

//Set up the natural API stuff
var Analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;

//Initialise the sentiment analysis stuff
var afinn = new Analyzer("English", stemmer, "afinn");
var senticon = new Analyzer("English", stemmer, "senticon");
var pattern = new Analyzer("English", stemmer, "pattern");

//return how long ago the tweet was made in a readable way
function calculateSince(datetime) {
    //create new date objects
    var tweetTime = new Date(datetime);
    var currentTime = new Date();

    //get the time difference from when the tweet was made to now
    var minutesAgo = Math.round((currentTime - tweetTime) / 60000);
    if (minutesAgo == 0) { var output = 'just now'; }
    else if (minutesAgo == 1) { var output = '1 minute ago'; }
    else if (minutesAgo < 60) { var output = minutesAgo + ' minutes ago'; }
    else if (minutesAgo < 120) { var output = 'about 1 hour ago'; }
    else if (minutesAgo < 1440) { var output = 'about ' + Math.round(minutesAgo / 60) + ' hours ago'; }
    else if (minutesAgo < 2880) { var output = '1 day ago'; }
    else {var output = Math.round(minutesAgo / 1440); + ' days ago';}
    return output;
};

var zoom;

async function getTweets(x, y){
    var promise = T.get('search/tweets', { q: ' ', count: 100, geocode: x+","+ y +","+zoom+"mi"})

    return promise.then(
        function(result){
            var fineTweets = []
            var data = result.data
            try {
                for (var i = 0; i < data.statuses.length; i++) {
                    //check if geolocation data is given in the tweet
                    if (data.statuses[i].geo != null) {
                        var tweet = data.statuses[i].text
                        var id =  data.statuses[i].id
    
                        var a = tweet.toString();
                        //strip any newlines in the tweet
                        a = a.replace(/(\r\n|\n|\r)/gm, "");
                        //convert tweet into an array of words
                        var b = a.split(" ");
			    
                        //get the sentiment of the tweet using different vocabularies
                        var sentA = afinn.getSentiment(b)
                        var sentB = senticon.getSentiment(b)
                        var sentC = pattern.getSentiment(b)
                        var overallSent = (sentA + sentB + sentC) / 3;
                        var sentSummary;
    
                        //group the sentiment and provide a word summary
                        if (overallSent < -0.1) { sentSummary = "Strongly Negative"; }
                        else if (overallSent < -0.02) { sentSummary = "Mildly Negative"; }
                        else if (overallSent<0.02) { sentSummary = "Undefined";}
                        else if (overallSent < 0.1) { sentSummary = "Mildly Positive"; }
                        else { sentSummary = "Strongly Positive"; }
                        
                        fineTweets.push(JSON.stringify({"id":id,"text":tweet ,"sentSummary":sentSummary ,"overallSent":overallSent,"geo":data.statuses[i].geo.coordinates,"age":calculateSince(data.statuses[i].created_at)}))
                    }   
                }
            } catch (err) {
                console.log("No tweets in this area")
                console.log(err)
            }

            return fineTweets.toString()
        })
}
  
var xy;

//creates a http server using node to host the website
app = http.createServer(async function (request, response) {

    //handeling the post requests
    if (request.method == 'POST') {
        console.log("POST");
        var body = '';
        request.once('data', function (data) {

            body += data;
            data = JSON.parse(body)
            xy = [data["lat"], data["lng"]]
            zoom = data["zoom"]
            zoom = (50/Math.pow(zoom, 1.3)).toString();
            
        });

        response.writeHead(200, {'Content-Type': 'text/html'}); 
        response.end('callback(\'{\"msg\": \"OK\"}\')');
    
    //handles the get requests
    } else {

    var pathname = url.parse(request.url).pathname;

    console.log("Request for " + pathname + " received.");

    response.writeHead(200);

    //sends the tweets to the client
    if(pathname == "/getTweets") {
        var tweets = await getTweets(xy[0], xy[1])
        response.write(tweets)
    } 
    else if(pathname == "/") {
        html = fs.readFileSync("./index.html", "utf8");
        response.write(html);
    } 
    else if (pathname == "/wrldEmbedded.js") {
        script = fs.readFileSync("./wrldEmbedded.js", "utf8");
        response.write(script);
    }

}

	response.end();
});

//opens the server up to port 8000
app.listen(8000)

console.log("Listening to server on 8000...");
