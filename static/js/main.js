
//var earth_radius = 3960.0
var earth_radius = 6371.0;
var degrees_to_radians = Math.PI/180.0;
var radians_to_degrees = 180.0/Math.PI;

function change_in_latitude(distance){
  // Given a distance north, return the change in latitude.
  return (distance/earth_radius)*radians_to_degrees

}

function change_in_longitude(latitude, distance){
  // Given a latitude and a distance west, return the change in longitude.
  // Find the radius of a circle around the earth at given latitude.
  r = earth_radius*Math.cos(latitude*degrees_to_radians)
  return (distance/r)*radians_to_degrees

}

function get_central_controller_location(){
  // Get coordinates of the central controller.
  return [-10.040397656836609, -55.03373871559225]
}

function update_central_controller_location(location){
  // Upate the coordinates of central controller using AJAX post
}


function convert_direction_to_north_or_west(distance_moved, direction){
  // Convert East and South direction to North and East.
  if( direction == "S"){
    distance_moved = distance_moved * -1;
    direction = "N";
  }
  else if (direction == "E"){
    distance_moved = distance_moved* -1;
    direction = "W";
  }
  return {
    "distance_moved": distance_moved,
    "direction": direction
  }
}


function gen_new_coordinates_from_change_in_coordinates(old_coordinates, change_in_coordinates){
  // Calculate new coordinates given coordinates(lat,lon) and change_in_coordinates(lat,lon).
  new_lat = old_coordinates[0]- change_in_coordinates[0]
  new_lon = old_coordinates[1] - change_in_coordinates[1]

  return [new_lat, new_lon]

}


function get_new_coordinates(old_coordinates, distance_moved, direction){
    // Get new coordinates given old coordinates (lat,lon), distance moved in kilometers.
    // direction of movement [N, S, E, W].

    // Convert directions if needed
    updated_data = convert_direction_to_north_or_west(distance_moved, direction)
    distance_moved = updated_data["distance_moved"]
    direction = updated_data["direction"]

    if (direction == "N"){
      latitude_change = change_in_latitude(distance_moved)
      change_in_coordinates = [latitude_change, 0]
    }
    else if (direction == "W"){
        latitude = old_coordinates[0]
        longitude_change = change_in_longitude(latitude, distance_moved)
        change_in_coordinates = [0, longitude_change]
      }
    else{

        throw "Not a valid direction of movement! Please use one of  ['N', 'S', 'E', 'W']"
      }

    return gen_new_coordinates_from_change_in_coordinates(old_coordinates, change_in_coordinates)
}

function gen_square_path(controller_coordinates, dimension){
  // Generate a square path around central controller for area of interest.
  path = []
  path.push(get_new_coordinates(controller_coordinates, dimension, "N"))
  path.push(get_new_coordinates(controller_coordinates, dimension, "E"))
  path.push(get_new_coordinates(controller_coordinates, dimension, "S"))
  path.push(get_new_coordinates(controller_coordinates, dimension, "W"))

  console.log(path);
  return path;
}

// gen_square_path(get_central_controller_location(), 5)

function add_markers(map, coordinates, icon){
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


function draw_polygon(map, path){
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

function add_controller_marker(map, center){
  // Add central controller to the map
  map.addMarker({
    lat: center[0],
    lng: center[1],
    title: 'Central Server ' + "Lat:"+ center[0] + ", Lng:" + center[1],
    icon: "http://i.picresize.com/images/2017/07/27/1a5k.png",
    draggable: true,
    dragend: function(event) {
      handle_controller_marker_drag(event);
  }
});
}

function handle_controller_marker_drag(event){
  // Handle the controller marker dragging event.
  var lat = event.latLng.lat();
  var lng = event.latLng.lng();
  var new_controller_location = [lat, lng];
  map.removePolygons();
  map.removeMarkers();

  // Update the controller location
  update_central_controller_location(new_controller_location)
  // Generate square path
  var path = gen_square_path(new_controller_location, 10)
  add_markers(map, path, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png")
  draw_polygon(map, path);
  add_controller_marker(map, new_controller_location);
  map.fitZoom();

}

var center = get_central_controller_location();

// Initialize map with central controller as center point.
var map = new GMaps({
  el: '#map',
  lat: center[0],
  lng: center[1]
});


// Add central controller draggable marker to the map
var path = gen_square_path(center, 10);
add_markers(map, path, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png")
draw_polygon(map, path);
add_controller_marker(map, center);
map.fitZoom();
