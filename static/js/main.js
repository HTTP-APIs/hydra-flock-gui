//var earthRadius = 3960.0
var earthRadius = 6371.0;
var degreesToRadians = Math.PI / 180.0;
var radiansToDegrees = 180.0 / Math.PI;

// Toastr plugin configuration
toastr.options = {
  "closeButton": true,
  "debug": false,
  "newestOnTop": true,
  "progressBar": false,
  "positionClass": "toast-bottom-right",
  "preventDuplicates": true,
  "onclick": null,
  "showDuration": "2000",
  "hideDuration": "1000",
  "timeOut": "5000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
}

var centralControllerUrl = "http://localhost:8080";
var centralControllerLocationPath = "/api/Location";
var centralControllerMessageCollectionPath = "/api/MessageCollection";
var center, map, path, message;
var activeDrones = [];
var droneMarkers = [];


// Distance conversion related functions

function changeInLatitude(distance) {
  // Given a distance north, return the change in latitude.
  return (distance / earthRadius) * radiansToDegrees;

}


function changeInLongitude(latitude, distance) {
  // Given a latitude and a distance west, return the change in longitude.
  // Find the radius of a circle around the earth at given latitude.
  r = earthRadius * Math.cos(latitude * degreesToRadians);
  return (distance / r) * radiansToDegrees;
}


function convertDistanceToNorthOrWest(distanceMoved, direction) {
  // Convert East and South direction to North and East.
  if (direction == "S") {
    distanceMoved = distanceMoved * -1;
    direction = "N";
  } else if (direction == "E") {
    distanceMoved = distanceMoved * -1;
    direction = "W";
  }
  return {
    "distanceMoved": distanceMoved,
    "direction": direction
  }
}


function generateNewCoordinatesFromChangeInCoordinates(oldCoordinates, changeInCoordinates) {
  // Calculate new coordinates given coordinates(lat,lon) and changeInCoordinates(lat,lon).
  newLat = oldCoordinates[0] + changeInCoordinates[0];
  newLon = oldCoordinates[1] + changeInCoordinates[1];

  return [newLat, newLon];
}


function getNewCoordinates(oldCoordinates, distanceMoved, direction) {
  // Get new coordinates given old coordinates (lat,lon), distance moved in kilometers.
  // direction of movement [N, S, E, W].

  // Convert directions if needed
  convertedLocationData = convertDistanceToNorthOrWest(distanceMoved, direction);
  distanceMoved = convertedLocationData["distanceMoved"];
  direction = convertedLocationData["direction"];

  if (direction == "N") {
    latitudeChange = changeInLatitude(distanceMoved);
    changeInCoordinates = [latitudeChange, 0];
  } else if (direction == "W") {
    latitude = oldCoordinates[0];
    longitudeChange = changeInLongitude(latitude, distanceMoved);
    changeInCoordinates = [0, longitudeChange];
  } else {

    throw "Not a valid direction of movement! Please use one of  ['N', 'S', 'E', 'W']";
  }

  return generateNewCoordinatesFromChangeInCoordinates(oldCoordinates, changeInCoordinates)
}


function genSquarePath(controllerCoordinates, areaOfInterestSquareDimension) {
  // Generate a square path around central controller for area of interest.
  var path = [];

  path.push(getNewCoordinates(getNewCoordinates(controllerCoordinates, areaOfInterestSquareDimension, "W"), areaOfInterestSquareDimension, "S"));
  path.push(getNewCoordinates(getNewCoordinates(controllerCoordinates, areaOfInterestSquareDimension, "W"), areaOfInterestSquareDimension, "N"));
  path.push(getNewCoordinates(getNewCoordinates(controllerCoordinates, areaOfInterestSquareDimension, "E"), areaOfInterestSquareDimension, "N"));
  path.push(getNewCoordinates(getNewCoordinates(controllerCoordinates, areaOfInterestSquareDimension, "E"), areaOfInterestSquareDimension, "S"));

  // console.log(path);
  return path;
}




//Data fetching related functions.

function getCentralControllerLocationAndInitialise() {
  // Get coordinates of the central controller and then inintialize the gui.

  $.ajax({
    type: "GET",
    url: centralControllerUrl + centralControllerLocationPath,
    success: function(data) {
      // console.log("coordinates", data["Location"].split(",").map(Number))

      toastr["success"]("Central Controller Coordinates retrieved successfully!");
      // Convert fetched location to data to array of coordinates [Lat, Lng]
      center = data["Location"].split(",").map(Number);
      // Initialise the Map UI with center as center point.
      initialiseGui(center);
    },
    error: function() {
      toastr["error"]("Error getting Central Controller Coordinates! Using default Coordinates.");
      center = [-10.040397656836609, -55.03373871559225];
      initialiseGui(center);
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}


function udpateCentralControllerLocation(location) {
  // Upate the coordinates of central controller using AJAX post request

  $.ajax({
    type: "POST",
    url: centralControllerUrl + centralControllerLocationPath,
    data: JSON.stringify({
      "Location": location.toString(),
      "@type": "Location"
    }),
    success: function() {
      toastr["success"]("Central Controller location successfully updated! New coordinates are " + location);
    },
    error: function() {
      toastr["error"]("Something went wrong while updating the central controller location!");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}


function deleteDrone(drone) {
  // Delete a drone from the central controller

  $.ajax({
    type: "DELETE",
    url: centralControllerUrl + drone["@id"],
    success: function() {
      toastr["success"]("Drone with id "+ drone["@id"]+ "successfully removed from central controller!");
      //Update the activeDrones list and generate new markers.
      getActiveDronesAndGenerateMarkers();
    },
    error: function() {
      toastr["error"]("Error deleting drone with id "+ drone["@id"]+ " from the central controller!");
      // Remove the drone from activeDrones list
      droneIndex = activeDrones.indexOf(drone);
      if (droneIndex > -1) {
        activeDrones.splice(droneIndex, 1);
        updateDronesPanel(activeDrones);
        toastr["info"]("Drone with id "+ drone["@id"]+ " removed from local activeDrones list.");

      }
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}


function submitMessage(message) {
  //Submit new message to the central controller.
  $.ajax({
    type: "PUT",
    url: centralControllerUrl + centralControllerMessageCollectionPath,
    data: JSON.stringify({
      "Message": message.toString(),
      "@type": "Message"
    }),
    success: function() {
      toastr["success"]("Message successfully submitted!");
    },
    error: function() {
      toastr["error"]("Error submitting message to the central controller. Please try again!");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });

}


function getDroneDetailsAndUpdateMarker(drone, marker) {
  // Get drone details from the central server, if drone is not valid delete that drone from the central server.
  // Update the drone marker in map UI

  $.ajax({
    type: "GET",
    url: centralControllerUrl + drone["@id"],
    success: function(data) {
      // Check if drone is faulty
      if (! checkDrone(data)) {
        // console.log(data);
        deleteDrone(drone);
      }
      else{
        // Extract drone position Coordinates
        dronePosition = data["DroneState"]["Position"].split(",").map(Number);
        marker.setPosition({lat: dronePosition[0], lng: dronePosition[1]})
        console.log("Drone marker position updated!");

      }
    },
    error: function() {
      toastr["error"]("Something wen't wrong while getting drone details! Please try refreshing the page.");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}

function getActiveDronesAndGenerateMarkers() {
  // Get active drone list from the central controller.
  $.ajax({
    type: "GET",
    url: centralControllerUrl + "/api/DroneCollection",
    success: function(data) {
      // Update the activeDrones global list
      activeDrones = data["members"];
      // Reset droneMarkers list
      droneMarkers = [];
      // Add the markers to the droneMarkers list.
      for(i = 0; i< data["members"].length;i++){
        marker = map.createMarker({
          lat: center[0],
          lng: center[1],
        })
        map.addMarker(marker);
        droneMarkers.push(marker);

      }
      // Update active drones panel in UI
      updateDronesPanel(activeDrones);
      toastr["success"]("Active drones list successfully updated!");
    },
    error: function() {
      toastr["error"]("Error while getting active drones list from the central controller! Please try hitting Refresh.");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}




// Ui related functions

function updateDronesPanel(dronesList) {
  // Update the drones panel in gui

  //Clear drone-list contents.
  $("#drone-list").empty();
  for (i = 0; i < dronesList.length; i++) {
    //Get drone id
    var droneId = dronesList[i]["@id"].match(/([^\/]*)\/*$/)[1];
    $("#drone-list").append('<li id="drone' + droneId + '"><a href="#">Drone id-' + droneId + '</a></li>');
  }
}


function addMarkers(map, coordinates, icon) {
  // Adds markers to the map given a list of coordinates and icon url.
  for (i = 0; i < coordinates.length; i++) {
    map.addMarker({
      lat: coordinates[i][0],
      lng: coordinates[i][1],
      title: String(coordinates[i][0]) + " ," + String(coordinates[i][1]),
      icon: icon,
    });
  }
}


function drawPolygonForPath(map, path) {
  // Draw a polygon on the map
  polygon = map.drawPolygon({
    paths: path, // pre-defined polygon shape
    strokeColor: '#2c3e50',
    strokeOpacity: 1,
    strokeWeight: 3,
    fillColor: '#FFF0',
    fillOpacity: 0.6
  });
}

function addCentralControllerMarker(map, center) {
  // Add central controller to the map
  map.addMarker({
    lat: center[0],
    lng: center[1],
    title: 'Central Server ' + "Lat:" + center[0] + ", Lng:" + center[1],
    icon: "http://i.picresize.com/images/2017/07/27/1a5k.png",
    draggable: true,
    dragend: function(event) {
      handleCentralControllerMarkerDrag(event);
    }
  });
}

function handleCentralControllerMarkerDrag(event) {
  // Handle the controller marker dragging event.
  var lat = event.latLng.lat();
  var lng = event.latLng.lng();
  var newCentralControllerLocation = [lat, lng];
  // remove all previous polygons and markers.
  map.removePolygons();
  map.removeMarkers();

  // Update the controller location
  udpateCentralControllerLocation(newCentralControllerLocation);
  // Generate new square path
  var path = genSquarePath(newCentralControllerLocation, 10);
  // Add four invisible markers for area of interest coordinates
  addMarkers(map, path, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png");
  //Draw new polygon on map
  drawPolygonForPath(map, path);
  // Add updated central controller marker
  addCentralControllerMarker(map, newCentralControllerLocation);
  // Update the active drones list and generate new markers
  getActiveDronesAndGenerateMarkers();
}


function checkDrone(drone){
  // Check if the drone object has a "DroneState object".
  if ("DroneState" in drone){
    return true;
  }
  else{
    return false;
  }
}


function getTile(coord, zoom, ownerDocument) {
  // Grid overlay tile function from gmaps.js
  var div = ownerDocument.createElement('div');
  div.innerHTML = coord;
  div.style.width = this.tileSize.width + 'px';
  div.style.height = this.tileSize.height + 'px';
  div.style.fontSize = '10';
  div.style.fontWeight = 'bolder';
  div.style.border = 'dotted 1px #aaa';
  div.style.textAlign = 'center';
  div.style.lineHeight = this.tileSize.height + 'px';
  return div;
};


function initialiseMap(center) {
  // Initialise map with central controller as center point.
  map = new GMaps({
    el: '#map',
    lat: center[0],
    lng: center[1]
  });
  return map;
}


function initialiseGui(center) {
  // Initialise the Simulation Map GUI

  map = initialiseMap(center);
  // Generate area of interest polygon path and add markers.
  path = genSquarePath(center, 10);
  addMarkers(map, path, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png");
  // Draw the polygon on map.
  drawPolygonForPath(map, path);
  // Add central controller draggable marker to the map
  addCentralControllerMarker(map, center);
  // Set map zoom level to 12
  map.setZoom(12);
  // Add Grid overlay to mamp
  map.addOverlayMapType({
    index: 0,
    tileSize: new google.maps.Size(128,128),
    getTile: getTile
  });
  //update the active drones list and generate drone markers
  getActiveDronesAndGenerateMarkers();
}

//Update the simulation UI every couple of seconds (Drone markers)
function updateSimulation() {
  if (activeDrones.length > 0) {
    for (i = 0; i < activeDrones.length; i++) {
      getDroneDetailsAndUpdateMarker(activeDrones[i], droneMarkers[i]);
    }
  }
  setTimeout(updateSimulation, 10000);
}





// Bindings to different elements

//Message form bindings
$("#message-submit-btn").click(function() {
  message = $("#message").val();
  if (message.length > 0) {
    submitMessage(message);
    $("#message").val("");
  }
});

$("#message-form").keypress(function(e) {
  if (e.which == 13) {
    message = $("#message").val();
    if (message.length > 0) {
      submitMessage(message);
      $("#message").val("");
    }
  }
});

// Drone list refresh button binding
$("#refresh-drone-list").click(function() {
  getActiveDronesAndGenerateMarkers();
});




// Initialize everything
getCentralControllerLocationAndInitialise();
updateSimulation();
