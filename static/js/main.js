//var earth_radius = 3960.0
var earth_radius = 6371.0;
var degrees_to_radians = Math.PI / 180.0;
var radians_to_degrees = 180.0 / Math.PI;

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

var central_server_url = "http://localhost:8080";
var center, map, path, message;
var active_drones = [];
var drone_index;

function change_in_latitude(distance) {
  // Given a distance north, return the change in latitude.
  return (distance / earth_radius) * radians_to_degrees;

}

function change_in_longitude(latitude, distance) {
  // Given a latitude and a distance west, return the change in longitude.
  // Find the radius of a circle around the earth at given latitude.
  r = earth_radius * Math.cos(latitude * degrees_to_radians);
  return (distance / r) * radians_to_degrees;

}

function get_central_controller_location_and_initialize() {
  // Get coordinates of the central controller and then inintialize the gui.

  $.ajax({
    type: "GET",
    url: central_server_url + "/api/Location",
    success: function(data) {
      // console.log("coordinates", data["Location"].split(",").map(Number))

      toastr["success"]("Central Controller Coordinates retrieved successfully!");
      center = data["Location"].split(",").map(Number);
      initialize_gui(center);
    },
    error: function() {
      toastr["error"]("Error getting Central Controller Coordinates! Using default Coordinates.");
      center = [-10.040397656836609, -55.03373871559225];
      initialize_gui(center);
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}


function update_central_controller_location(location) {
  // Upate the coordinates of central controller using AJAX post

  $.ajax({
    type: "POST",
    url: central_server_url + "/api/Location",
    data: JSON.stringify({
      "Location": location.toString(),
      "@type": "Location"
    }),
    success: function() {
      toastr["success"]("Central Controller location successfully updated! New coordinates are " + location);
    },
    error: function() {
      toastr["error"]("Error updating the central server coordinates. Please try again!");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}

function delete_drone(drone) {
  $.ajax({
    type: "DELETE",
    url: central_server_url + drone["@id"],
    success: function() {
      toastr["success"]("Faulty drone with id "+ drone["@id"]+ "successfully removed from Central controller.");
      //Update the active_drones list.
      update_drones_list();
    },
    error: function() {
      toastr["error"]("Error deleting faulty drone with id "+ drone["@id"]+ " from central controller");
      drone_index = active_drones.indexOf(drone);
      if (drone_index > -1) {
        active_drones.splice(drone_index, 1);
        update_drones_panel(active_drones);
        toastr["info"]("Faulty drone with id "+ drone["@id"]+ " removed from local drone list.");

      }
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });
}

function submit_message(message) {
  //Submit message to the central controller.
  $.ajax({
    type: "PUT",
    url: central_server_url + "/api/MessageCollection",
    data: JSON.stringify({
      "Message": message.toString(),
      "@type": "Message"
    }),
    success: function() {
      toastr["success"]("Message successfully submitted!");
    },
    error: function() {
      toastr["error"]("Error submitting message. Please try again!");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });

}

function update_drones_panel(drone_list) {
  // Update the drones panel in gui
  $("#drone-list").empty();
  for (i = 0; i < drone_list.length; i++) {
    var drone_id = drone_list[i]["@id"].match(/([^\/]*)\/*$/)[1];
    $("#drone-list").append('<li id="drone' + drone_id + '"><a href="#">Drone ' + drone_id + '</a></li>');
  }
}

function update_drones_list() {
  // Get active drone list from the central controller.
  $.ajax({
    type: "GET",
    url: central_server_url + "/api/DroneCollection",
    success: function(data) {
      console.log("Active dronelist", data["members"]);
      active_drones = data["members"];
      update_drones_panel(active_drones);
      toastr["success"]("Drone list successfully updated!");
    },
    error: function() {
      toastr["error"]("Error while getting list of drones from central server! Please try hitting Refresh.");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });


}

function get_and_check_drone(drone) {
  // Get drone details from the central server, if drone is not valid delete that drone from the central server.
  // Get active drone list from the central controller.
  $.ajax({
    type: "GET",
    url: central_server_url + drone["@id"],
    success: function(data) {
      if (!("DroneState" in data)) {
        // console.log(data);
        delete_drone(drone);

      }
      // toastr["success"]("Drone list successfully updated!");
    },
    error: function() {
      // toastr["error"]("Error while getting list of drones from central server! Please try hitting Refresh.");
    },
    dataType: 'json',
    crossDomain: true,
    contentType: "application/ld+json",
  });

}

function convert_direction_to_north_or_west(distance_moved, direction) {
  // Convert East and South direction to North and East.
  if (direction == "S") {
    distance_moved = distance_moved * -1;
    direction = "N";
  } else if (direction == "E") {
    distance_moved = distance_moved * -1;
    direction = "W";
  }
  return {
    "distance_moved": distance_moved,
    "direction": direction
  }
}


function gen_new_coordinates_from_change_in_coordinates(old_coordinates, change_in_coordinates) {
  // Calculate new coordinates given coordinates(lat,lon) and change_in_coordinates(lat,lon).
  new_lat = old_coordinates[0] - change_in_coordinates[0];
  new_lon = old_coordinates[1] - change_in_coordinates[1];

  return [new_lat, new_lon]

}


function get_new_coordinates(old_coordinates, distance_moved, direction) {
  // Get new coordinates given old coordinates (lat,lon), distance moved in kilometers.
  // direction of movement [N, S, E, W].

  // Convert directions if needed
  updated_data = convert_direction_to_north_or_west(distance_moved, direction);
  distance_moved = updated_data["distance_moved"];
  direction = updated_data["direction"];

  if (direction == "N") {
    latitude_change = change_in_latitude(distance_moved);
    change_in_coordinates = [latitude_change, 0];
  } else if (direction == "W") {
    latitude = old_coordinates[0];
    longitude_change = change_in_longitude(latitude, distance_moved);
    change_in_coordinates = [0, longitude_change];
  } else {

    throw "Not a valid direction of movement! Please use one of  ['N', 'S', 'E', 'W']";
  }

  return gen_new_coordinates_from_change_in_coordinates(old_coordinates, change_in_coordinates)
}

function gen_square_path(controller_coordinates, dimension) {
  // Generate a square path around central controller for area of interest.
  var path = [];
  path.push(get_new_coordinates(controller_coordinates, dimension, "N"));
  path.push(get_new_coordinates(controller_coordinates, dimension, "E"));
  path.push(get_new_coordinates(controller_coordinates, dimension, "S"));
  path.push(get_new_coordinates(controller_coordinates, dimension, "W"));

  console.log(path);
  return path;
}

// gen_square_path(get_central_controller_location(), 5)

function add_markers(map, coordinates, icon) {
  // Adds markers to the map given a list of coordinates and icon url.
  for (i = 0; i < coordinates.length; i++) {
    map.addMarker({
      lat: coordinates[i][0],
      lng: coordinates[i][1],
      title: String(coordinates[i][0]) + " ," + String(coordinates[i][1]),
      icon: icon,
      // icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png",
    });
  }
}


function draw_polygon(map, path) {
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

function add_controller_marker(map, center) {
  // Add central controller to the map
  map.addMarker({
    lat: center[0],
    lng: center[1],
    title: 'Central Server ' + "Lat:" + center[0] + ", Lng:" + center[1],
    icon: "http://i.picresize.com/images/2017/07/27/1a5k.png",
    draggable: true,
    dragend: function(event) {
      handle_controller_marker_drag(event);
    }
  });
}

function handle_controller_marker_drag(event) {
  // Handle the controller marker dragging event.
  var lat = event.latLng.lat();
  var lng = event.latLng.lng();
  var new_controller_location = [lat, lng];
  map.removePolygons();
  map.removeMarkers();

  // Update the controller location
  update_central_controller_location(new_controller_location);
  // Generate square path
  var path = gen_square_path(new_controller_location, 10);
  add_markers(map, path, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png");
  draw_polygon(map, path);
  add_controller_marker(map, new_controller_location);
  map.fitZoom();

}





function initialize_map(center) {
  // Initialize map with central controller as center point.
  map = new GMaps({
    el: '#map',
    lat: center[0],
    lng: center[1]
  });
  return map;
}

function initialize_gui(center) {
  // Initialize the Simulation Map GUI

  map = initialize_map(center);
  // Generate area of interest polygon path and add markers.
  path = gen_square_path(center, 10);
  add_markers(map, path, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png");
  // Draw the polygon on map.
  draw_polygon(map, path);
  // Add central controller draggable marker to the map
  add_controller_marker(map, center);
  // fitZoom map
  map.fitZoom();
}

get_central_controller_location_and_initialize();
update_drones_list();

$("#message-submit-btn").click(function() {
  message = $("#message").val();
  if (message.length > 0) {
    submit_message(message);
    $("#message").val("");
  }
});

$("#message-form").keypress(function(e) {
  if (e.which == 13) {
    message = $("#message").val();
    if (message.length > 0) {
      submit_message(message);
      $("#message").val("");
    }
  }
});

$("#refresh-drone-list").click(function() {
  update_drones_list();
});

function update_simulation() {
  // console.log(active_drones);
  if (active_drones.length > 0) {
    for (i = 0; i < active_drones.length; i++) {
      get_and_check_drone(active_drones[i]);
    }
  }
  setTimeout(update_simulation, 1500);
}

update_simulation();
