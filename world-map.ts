// Hand-authored, deliberately schematic coastlines in longitude/latitude.
// No downloaded geography, external map assets, or cross-project material.
import assert from "node:assert/strict";

const continents = [
  [[-168,72],[-150,70],[-139,61],[-130,55],[-125,48],[-126,42],[-117,32],[-111,28],[-106,23],[-97,19],[-89,19],[-87,16],[-83,10],[-77,8],[-80,16],[-87,21],[-82,25],[-80,32],[-73,41],[-65,45],[-58,52],[-66,59],[-77,61],[-87,68],[-105,73],[-125,76],[-145,73]],
  [[-53,82],[-23,77],[-27,69],[-43,60],[-51,60],[-63,69],[-61,77]],
  [[-81,12],[-72,10],[-63,10],[-52,4],[-35,-7],[-39,-20],[-49,-29],[-55,-37],[-66,-55],[-73,-48],[-74,-34],[-80,-13],[-81,-1],[-76,4]],
  [[-10,36],[-9,44],[-4,49],[4,51],[9,56],[5,60],[16,71],[28,71],[35,65],[51,69],[69,75],[99,75],[124,72],[145,66],[172,65],[178,55],[158,53],[144,46],[136,42],[129,34],[121,30],[120,22],[110,18],[110,4],[105,-4],[99,4],[97,18],[88,22],[80,9],[74,17],[69,25],[57,25],[52,16],[43,13],[35,29],[27,36],[21,40],[17,45],[16,38],[12,41],[8,44],[1,41]],
  [[-17,36],[-6,35],[9,37],[24,32],[33,31],[36,23],[43,12],[51,11],[45,1],[41,-12],[34,-25],[22,-35],[16,-32],[11,-19],[9,-7],[1,5],[-9,5],[-17,15]],
  [[113,-22],[115,-33],[129,-35],[138,-36],[146,-39],[153,-29],[150,-20],[142,-11],[136,-13],[130,-12],[123,-17]],
  [[-8,58],[-3,59],[0,52],[-5,50],[-6,54]],
  [[-10,55],[-7,55],[-7,51],[-10,52]],
  [[130,32],[136,35],[142,42],[143,46],[138,42],[135,37]],
  [[95,5],[101,0],[105,-6],[104,-9],[99,-3]],
  [[108,-6],[118,-7],[127,-8],[133,-5],[139,-4],[143,-8],[132,-10],[122,-9],[112,-9]],
  [[48,-14],[50,-17],[48,-25],[44,-26],[45,-19]],
  [[171,-34],[177,-39],[174,-42],[168,-46],[166,-45],[171,-39]],
];

export function isMapLandPoint(x, y, box, polygonIndex) {
  const lon = (x - box.x - 5) / (box.width - 10) * 360 - 180;
  const lat = 85 - (y - box.y - 3) / (box.height - 6) * 145;
  const polygons = polygonIndex === undefined ? continents : [continents[polygonIndex]];
  return polygons.some(polygon => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, ay] = polygon[i]; const [bx, by] = polygon[j];
      if ((ay > lat) !== (by > lat) && lon < (bx - ax) * (lat - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  });
}

export function drawWorldMap(raster, stories, regionColors, box) {
  const project = (lon, lat) => [
    box.x + 5 + (lon + 180) / 360 * (box.width - 10),
    box.y + 3 + (85 - lat) / 145 * (box.height - 6),
  ];
  raster.rect(box.x, box.y, box.width, box.height, "#EFECE4");
  for (const lon of [-90,0,90]) {
    const [x] = project(lon,0);
    raster.line(x,box.y+3,x,box.y+box.height-3,"#E3DED3");
  }
  for (const lat of [0,30,60]) {
    const [,y] = project(0,lat);
    raster.line(box.x+5,y,box.x+box.width-5,y,"#E3DED3");
  }
  for (const continent of continents) {
    const points = continent.map(([lon,lat])=>project(lon,lat));
    raster.polygon(points,"#C7C2B4");
    raster.path(points,"#9E988A",1,true);
  }
  const nasa = stories.filter(story=>story.region==="Science").map(story=>project(story.pin.lon,story.pin.lat));
  const orbitX = (nasa[0][0]+nasa[1][0])/2;
  const orbitY = (nasa[0][1]+nasa[1][1])/2;
  raster.arc(orbitX,orbitY,20,8,0,Math.PI*2,"#8276A6");
  for(const [x,y] of nasa) {
    raster.line(x-3,y-3,x+3,y+3,"#6B608D");
    raster.line(x-3,y+3,x+3,y-3,"#6B608D");
  }
  const offsets = [[0,0]];
  for (const distance of [16,23,32,40]) {
    for (const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0],[-0.707,-0.707],[0.707,-0.707],[0.707,0.707],[-0.707,0.707]]) {
      offsets.push([Math.round(dx*distance),Math.round(dy*distance)]);
    }
  }
  const pins = [];
  for(const story of stories) {
    const [actualX,actualY] = project(story.pin.lon,story.pin.lat);
    let choice;
    for(const [dx,dy] of offsets) {
      const x=Math.round(actualX+dx); const y=Math.round(actualY+dy);
      if(x<box.x+8||x>box.x+box.width-8||y<box.y+8||y>box.y+box.height-8) continue;
      if(pins.every(pin=>Math.hypot(pin.x-x,pin.y-y)>=15)) { choice={x,y}; break; }
    }
    assert.ok(choice,`No collision-free position for map pin ${story.id}`);
    pins.push({id:story.id,...choice,actualX:Number(actualX.toFixed(2)),actualY:Number(actualY.toFixed(2)),color:regionColors.get(story.region),place:story.pin.place});
  }
  // Audit-only badge offsets from the true anchors; leave all other badges,
  // story coordinates, coastlines and true-location leader anchors unchanged.
  const auditedOffsets = new Map([[5,[0,3]],[6,[-5,-7]],[11,[3,-3]],[12,[-4,2]],[14,[8,4]],[15,[-1,-4]],[16,[4,-4]]]);
  for (const pin of pins) {
    const offset = auditedOffsets.get(pin.id);
    if (!offset) continue;
    const story = stories.find(item => item.id === pin.id);
    const [anchorX, anchorY] = project(story.pin.lon, story.pin.lat);
    pin.badgeAdjustment = { fromX: pin.x, fromY: pin.y, offsetFromAnchor: offset };
    pin.x = Math.round(anchorX + offset[0]); pin.y = Math.round(anchorY + offset[1]);
    pin.landPolygonIndex = [11,12,15,16].includes(pin.id) ? 0 : 3;
    pin.onDrawnLand = isMapLandPoint(pin.x, pin.y, box, pin.landPolygonIndex)
      && isMapLandPoint(pin.x + 0.5, pin.y + 0.5, box, pin.landPolygonIndex);
    assert.ok(pin.onDrawnLand, `Audited map pin ${pin.id} must sit on its drawn continent`);
  }
  for(const pin of pins) {
    if(Math.hypot(pin.x-pin.actualX,pin.y-pin.actualY)>3) {
      raster.line(pin.actualX,pin.actualY,pin.x,pin.y,"#FFFFFF",2);
      raster.line(pin.actualX,pin.actualY,pin.x,pin.y,pin.color,1);
      raster.ellipse(pin.actualX,pin.actualY,1.5,1.5,pin.color);
    }
  }
  for(const pin of pins) {
    raster.ellipse(pin.x,pin.y,7,7,"#FFFFFF");
    raster.ellipse(pin.x,pin.y,6,6,pin.color);
  }
  assert.deepEqual(pins.map(pin=>pin.id),Array.from({length:16},(_,i)=>i+1));
  for(let i=0;i<pins.length;i++) for(let j=0;j<i;j++) assert.ok(Math.hypot(pins[i].x-pins[j].x,pins[i].y-pins[j].y)>=15);
  return pins;
}
