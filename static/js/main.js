function get_area_of_interest() {
  return {
    "lower_left": [-30.040397656836609, -30.03373871559225],
    "upper_right": [-10.040248585302038, -60.03993927003302]
  }
}

function gen_square(area_of_interest) {
  var lower_left, upper_right;

  lower_left = area_of_interest["lower_left"];
  upper_right = area_of_interest["upper_right"]
  var path = [];
  // console.log(lower_left, upper_right);
  path.push(lower_left)
  path.push([lower_left[0], upper_right[1]])
  path.push(upper_right)
  path.push([upper_right[0], lower_left[1]])


  // console.log(path)
  return path;
}

function get_center(area_of_interest) {
  lat = (area_of_interest["lower_left"][0] + area_of_interest["upper_right"][0]) / 2;
  lng = (area_of_interest["lower_left"][1] + area_of_interest["upper_right"][1]) / 2;

  return {
    "lat": lat,
    "lng": lng
  };

}
var center = get_center(get_area_of_interest())

var map = new GMaps({
  el: '#map',
  lat: center["lat"],
  lng: center["lng"]
});



// Map overlays won't work
//
// var getTile = function(coord, zoom, ownerDocument) {
//   var div = ownerDocument.createElement('div');
//   div.innerHTML = coord;
//   div.style.width = this.tileSize.width + 'px';
//   div.style.height = this.tileSize.height + 'px';
//   div.style.fontSize = '10';
//   div.style.fontWeight = 'bolder';
//   div.style.border = 'dotted 1px #aaa';
//   div.style.textAlign = 'center';
//   div.style.lineHeight = this.tileSize.height + 'px';
//   return div;
// };
//
// map.addOverlayMapType({
//   index: 0,
//   tileSize: new google.maps.Size(64, 64),
//   getTile: getTile
// });





map.addMarker({
  lat: center["lat"],
  lng: center["lng"],
  title: 'Central Server',
  icon: "http://i.picresize.com/images/2017/07/24/R2Izc.png",
  click: function(e) {
    alert('You clicked in this marker');
  }
});


// map.fitZoom();
console.log(get_area_of_interest())
var path = gen_square(get_area_of_interest());
for (i = 0; i < path.length; i++) {
  map.addMarker({
    lat: path[i][0],
    lng: path[i][1],
    title: String(path[i][0]) + " ," + String(path[i][1]),
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/3by2white.svg/150px-3by2white.svg.png",
  });
}
map.fitZoom();
// var

console.log(path)
polygon = map.drawPolygon({
  paths: path, // pre-defined polygon shape
  strokeColor: '#2c3e50',
  strokeOpacity: 1,
  strokeWeight: 3,
  fillColor: '#FFF0',
  fillOpacity: 0.6
});
