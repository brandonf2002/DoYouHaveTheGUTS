var map = L.Wrld.map("map", "api-key", {
	center: [37.76926350819824, -122.41457583955498],
	zoom: 15
});

var markers = []
var ids = []
iconDims = new L.Point(60, 100)
var POIicon = {
	"Strongly Negative" : new L.Icon({
		iconUrl:"https://cdn.discordapp.com/attachments/807943427873701908/807943517124821052/poi_red.png",
		iconSize: iconDims,
	}),
	"Mildly Negative" : new L.Icon({
		iconUrl:"https://cdn.discordapp.com/attachments/807943427873701908/807943519288164413/poi_yellow.png",
		iconSize: iconDims,
	}),
	"Undefined" : new L.Icon({
		iconUrl:"https://cdn.discordapp.com/attachments/807943427873701908/807943509474541588/poi_grey.png",
		iconSize: iconDims,
	}),
	"Mildly Positive" : new L.Icon({
		iconUrl:"https://cdn.discordapp.com/attachments/807943427873701908/807943510165553152/poi_light_green.png",
		iconSize: iconDims,
	}),
	"Strongly Positive" : new L.Icon({
		iconUrl:"https://cdn.discordapp.com/attachments/807943427873701908/807943507897614376/poi_green.png",
		iconSize: iconDims,
	})
}

//function to place the marker at (x, y) cords with relivant info
function placeMarker(x, y, text, id, age, sentiment){
	var marker = L.marker([x, y], {
		title: text + '\n--' + age,
		elevation: 50
	})
	if (!ids.includes(id)){
		marker.setIcon(POIicon[sentiment]);
		ids.push(id)
		marker.bindPopup(marker.options.title).openPopup();
		marker.addTo(map);
		markers.push(marker);
	}
}

//pulls the scrapped tweets from the server to the front end
async function getTweets(event) {
	var xmlhttp = new XMLHttpRequest(); 
	xmlhttp.open("POST", "/json-handler");
	xmlhttp.setRequestHeader("Content-Type", "application/json");
	xmlhttp.send(JSON.stringify({"lat":event.latlng["lat"], "lng":event.latlng["lng"], "zoom":map.getZoom()}));

	var xhttp = new XMLHttpRequest();

	//creating a Promise as the process can take upwards or a few hundred milliseconds, want to ensure the data stays whole and uncorrupted
	var p = new Promise(async function (resolve, reject) {
		xhttp.onreadystatechange = async function() {
			if (this.readyState == 4 && this.status == 200) {
				resolve(this.responseText)
			}
		};
	})

	xhttp.open("GET", "getTweets", true);
	xhttp.send();

	return p
}

//parsing the string of many tweets into a few json objects
function parseTweets(tweets) {
	tweets = tweets.substring(1, tweets.length-1);
	tweets = tweets.split("},{"); 

	tweetObjects = []

	for (var i = 0; i < tweets.length; i++) {
		tweets[i] = "{"+tweets[i]+"}"
		tweetObjects.push(JSON.parse(tweets[i]))
	}

	return tweetObjects
}

//function to get, parse and place the tweets onto the map
async function mapTweets(event) {
	tweets = await getTweets(event)
	tweets = parseTweets(tweets)
	try {
		for (var i = 0; i < tweets.length; i++) {
			placeMarker(
				tweets[i]["geo"][0], 
				tweets[i]["geo"][1], 
				tweets[i]["text"], 
				tweets[i]["id"], 
				tweets[i]["age"], 
				tweets[i]["sentSummary"]
			)
		} 
	} catch (err) {
		//do nothing
	}

}

//starts the proccess of scanning the nearby region for tweets
map.on("click", mapTweets);
