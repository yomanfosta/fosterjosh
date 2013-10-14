var directionsService = new google.maps.DirectionsService();
var map; //initialized in init so we can get mapOptions

var names = [];
//strings for our cities
	names[0] = "Philadelphia, PA, USA";
	names[1] = "New York, NY, USA";
	names[2] = "Washington, DC, USA";
	names[3] = "Chicago, IL, USA";
	names[4] = "St. Louis, MO, USA";
	names[5] = "Los Angeles, CA, USA";
	names[6] = "Dallas, TX, USA";
	names[7] = "Toledo, OH, USA";
	names[8] = "Phoenix, AZ, USA";
	names[9] = "Seattle, WA, USA";

var nodes = [];
var start = -1; 
var end = -1;
for(var i=0;i<10;i++)
	{
		nodes[i] = {};
		nodes[i].num = i;
	}

var ajacent = [];

var iHandled = 0;
//so we don't ever have to add or delete nodes so we only need to worry about access time, so we're going to use an ajacent matrix
	for(var i=0;i<10;i++)
	{
		ajacent[i] = [];
		for(var j=0;j<10;j++)
		{
			ajacent[i][j] = {};
		}
	}
function init()
{
	var mapOptions = 
	{
		zoom: 4,
		center: new google.maps.LatLng(39.8282, -98.5795), //currently defaults to over Philadelphia
		mapTypeId: google.maps.MapTypeId.ROADMAP
	}
	map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
	
	//we have a manageable amount of locations: 10 and a custom built web of roads we only want to use... so each one is just going to be in its own var
	var geocoder = new google.maps.Geocoder();
	for(var i=0;i<10;i++)
	{
		geocoder.geocode({'address': names[i]} ,handleMapQuery);	
	};
	initializeEdges();
	alert("pick a start and end location from the cities provided... only the highlighted paths may be used to get you from point A to point B");
	
}

function initializeEdges()
{
	if(iHandled<10)
	{
		setTimeout(initializeEdges,1);
	}
	else
	{
		//So normally an ajacentcy matrix can only cantain bools.. but because we're in JS we can use objects in our matrix.. its not as efficient as one holding bools, but who cares, lets have us some fun
		//we only have 11 edges so we're just going to initialize them manually, one at a time.. a tad less messy
		//philly edges first.. because its the best
		//to nyc
		configEdge(0,1);

		//TO DC 
		configEdge(0,2);
		
		//rest of the NYC edges
		//to toledo
		configEdge(1,7);
		
		
		//DC to dALLAS
		configEdge(2,6);
		
		//chi to st l
		configEdge(3,4);
		
		//la to PHX
		configEdge(5,8);
		
		//la to seattle
		configEdge(5,9);
		
		//sl to toledo
		configEdge(4,7);
		
		//phx to dallas
		configEdge(8,6);

		//stl to dal
		configEdge(4,6);

		//chicago to sea
		configEdge(4,9);

		//apparently google has a query limit for the directionService so we'll only do 10 edges
		//phx to toledo
		//configEdge(8,7);
		
	}
	
}

//used to get directionsResult from Google
function configEdge(startNode, endNode)
{
	var request = 
		{
			origin: nodes[startNode].latlng,
			destination: nodes[endNode].latlng,
			travelMode: google.maps.DirectionsTravelMode.DRIVING
		};
	ajacent[startNode][endNode].request = request;
	directionsService.route(request, function(response,status) 
	{
		if (status == google.maps.DirectionsStatus.OK) 
		{
			//we need to create new renderer, add it to our edge object
			ajacent[startNode][endNode].renderer = new google.maps.DirectionsRenderer();
			ajacent[startNode][endNode].renderer.setMap(map);
			ajacent[startNode][endNode].renderer.setDirections(response);
			//attach diretions response object to object as well.
			ajacent[startNode][endNode].route = response.routes[0]; 
			ajacent[startNode][endNode].distance = getTotalDistance(startNode,endNode);
			ajacent[endNode][startNode] = ajacent[startNode][endNode];
		}
	});

}
function getTotalDistance(startNode,endNode)
{
	var sum = 0;
	//need to loop through route array and add total
	for (var i=0;i<ajacent[startNode][endNode].route.legs.length;i++)
	{
		sum += ajacent[startNode][endNode].route.legs[i].distance.value;
	}
	//we're doing this shit in miles
	return sum*0.000621371;
}

function handleMapQuery(results, status)
{
	if (status === google.maps.GeocoderStatus.OK)
	{

		//check to see which city we are
		console.log(results[0].formatted_address);
		var mylocation = {};
		for(var i=0; i<results.length;i++)
		{
			for(var j=0; j<10;j++)
			{
				if( results[i].formatted_address === names[j])
				{
					mylocation.name = names[j];
					mylocation.latlng = results[i].geometry.location;
					mylocation.lat = mylocation.latlng.lat();
					mylocation.lng = mylocation.latlng.lng();

					//create marker, add to map, redraw?
					var markerOptions = { map: map, title: names[j], clickable: true, position: mylocation.latlng};
					mylocation.marker = new google.maps.Marker(markerOptions);

					
					nodes[j] = mylocation;
					google.maps.event.addListener(nodes[j].marker,'click',function(){
						//check to see if start or end has been defined
						if( start === -1)
						{
							start = j;
						}
						else if(end === -1)
						{
							end = j;
							//make the magic happen
							var astarCount = Astar();
							var RandomCount = Random();
							alert("Astar took "+astarCount+" evaluations, Random took "+RandomCount);

						}
						else
						{
							start = j;

							end = -1;
						}
					});
					iHandled++;

					return;
				}
			}
		}
	}
}
function Astar()
{
	var fringe = [];
	//set counter to 0
	//add all nodes from current to fringe
	var current = {num:start, Parent:null,f:Infinity};
	var closed = [current];
	do
	{
		var next = {f: Infinity};
		var nextindex = -1;
		for(var i=0;i<10;i++)
		{
			if(ajacent[current.num][i].distance!=undefined)
			{
				console.log("evaluating: "+nodes[current.num].name);
				var mynode= {};
				mynode.num = i;
				mynode.Parent = current;
				if(mynode.num===end)
				{
					while(mynode.num!=start)
					{
						if(mynode.Parent!=null)
							ajacent[mynode.num][mynode.Parent.num].renderer.setOptions({polylineOptions:{strokeColor: 'red', map: map} })
						mynode = mynode.Parent;
					}
					//return number of cells evaluated
					return closed.length;

				}
				mynode.f = g(mynode)+ h(i);
				var infringeOrClosed = false;
				
				for(var j=0;j<fringe.length;j++)
				{
					if(fringe[j].num===mynode.num)
					{
						infringeOrClosed = true;
					}
				}
				for(var j=0;j<closed.length;j++)
				{
					if(closed[j].num===mynode.num)
					{
						infringeOrClosed = true;
					}
				}
				if(!infringeOrClosed)
					fringe.push(mynode);
			}
		}
		for(var i=0; i<fringe.length; i++)
		{
			if(fringe[i].f<next.f)
			{
				next = fringe[i];
				nextindex = i;
			}
		}
		current = next;
		closed.push(next);
		fringe.splice(nextindex,1);
	}
	while(fringe.length!=0 || closed.length<10);
	//if we're here we failed... something went terribly wrong
	alert("we couldn't find end, which shouldn't be possible");
}
function Random()
{
	var fringe = [];
	//add all nodes from current to fringe
	var current = {num:start, Parent:null,f:Infinity};
	var closed = [current];
	do
	{
		//console.log("evaluating: "+nodes[current.num].name);
				
		for(var i=0;i<10;i++)
		{
			if(ajacent[current.num][i].distance!=undefined)
			{
				var mynode= {};
				mynode.num = i;
				mynode.Parent = current;
				if(mynode.num===end)
				{
					while(mynode.num!=start)
					{
						if(mynode.Parent!=null)
							ajacent[mynode.num][mynode.Parent.num].renderer.setOptions({polylineOptions:{strokeColor: 'red'} })
						mynode = mynode.Parent;
					}
					//return number of cells evaluated
					return closed.length;
				}
				var infringe = false;
					
				for(var j=0;j<fringe.length;j++)
				{
					if(fringe[j].num===mynode.num)
					{
						infringe = true;
					}
				}
				if(!infringe)
					fringe.push(mynode);
			}
		}

		current = fringe[Math.floor(Math.random()*fringe.length)];
		closed.push(current);


	}
	while(fringe.length!=0 || closed.length<10);
	//if we're here we failed... something went terribly wrong
	alert("we couldn't find end, which shouldn't be possible");
}

function h(index)
{
	return Math.sqrt( Math.pow(nodes[index].lat-nodes[end].lat,2) + Math.pow(nodes[index].lng-nodes[end].lng,2));
}
function g(mynode)
{
	var current = mynode;
	sum = 0;
	while(current.num != start)
	{
		sum+=ajacent[current.num][current.Parent.num].distance;
		current = current.Parent;
	}
	return sum;
}

window.onload = init;