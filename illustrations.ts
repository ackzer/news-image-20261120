// Original geometric scenes. All coordinates are authored here, not imported.
export function illustrate(raster, story, box) {
  const baseW = story.hero ? 314 : 184;
  const baseH = story.hero ? 118 : 44;
  const sx = box.width / baseW; const sy = box.height / baseH;
  const point = ([x, y]) => [box.x + x * sx, box.y + y * sy];
  const rect = (x, y, w, h, c) => raster.rect(...point([x, y]), w * sx, h * sy, c);
  const ellipse = (x, y, rx, ry, c) => raster.ellipse(...point([x, y]), rx * sx, ry * sy, c);
  const line = (x1, y1, x2, y2, c, t = 1) => raster.line(...point([x1, y1]), ...point([x2, y2]), c, t);
  const path = (p, c, t = 1, close = false) => raster.path(p.map(point), c, t, close);
  const polygon = (p, c) => raster.polygon(p.map(point), c);
  const arc = (x, y, rx, ry, a, b, c, t = 1) => raster.arc(...point([x, y]), rx * sx, ry * sy, a, b, c, t);
  const bg = c => rect(0, 0, baseW, baseH, c);
  const tau = Math.PI * 2;
  raster.clipped(box, () => {
    switch (story.id) {
      case 1: {
        bg("#1B2432");
        polygon([[0,67],[0,49],[23,48],[23,39],[32,39],[32,52],[54,52],[54,44],[64,44],[64,54],[90,54],[110,64],[130,58],[170,66],[210,52],[229,58],[250,48],[275,54],[314,48],[314,72]], "#2C3D50");
        rect(0, 72, 314, 46, "#0F172A");
        for (let i = 0; i < 18; i++) {
          const x = 10 + (i * 43) % 245;
          line(x, 81 + i * 2, Math.min(307, x + 15 + (i * 13) % 45), 81 + i * 2, "#29485A");
        }
        for (let i = 0; i < 3; i++) {
          const x = 4 + i * 103;
          arc(x + 49, 79, 46, 30, Math.PI, tau, "#64748B", 4);
          arc(x + 49, 79, 40, 24, Math.PI, tau, "#A2ADBA", 1);
          line(x, 78, x + 98, 78, "#8B99A7", 4);
          for (let j = 1; j < 6; j++) {
            const px = x + j * 16;
            const py = 79 - Math.sqrt(Math.max(0, 1 - ((px - x - 49) / 46) ** 2)) * 30;
            line(px, py, px, 76, "#738698", 1);
          }
          rect(x + 14, 80, 7, 21, "#64748B"); rect(x + 78, 80, 7, 21, "#64748B");
        }
        for (const [cx, cy] of [[150,65],[259,66]]) {
          ellipse(cx + 9, cy - 26, 12, 14, "#47515A");
          ellipse(cx + 16, cy - 40, 15, 14, "#424B53");
          polygon([[cx-20,cy+6],[cx-7,cy-2],[cx-14,cy-20],[cx-2,cy-9],[cx+3,cy-30],[cx+8,cy-7],[cx+24,cy-18],[cx+12,cy-1],[cx+24,cy+7]], "#DC2626");
          polygon([[cx-10,cy+7],[cx-2,cy-5],[cx+2,cy-18],[cx+7,cy-1],[cx+13,cy+7]], "#F59E0B");
          ellipse(cx + 3, cy + 4, 5, 4, "#FDE68A");
          line(cx - 8, 91, cx + 17, 91, "#B45309", 2);
          line(cx - 3, 96, cx + 13, 96, "#F59E0B");
        }
        break;
      }
      case 2: {
        bg("#1D5B79");
        polygon([[0,0],[174,0],[169,15],[156,27],[165,38],[146,47],[149,58],[130,70],[127,83],[109,91],[106,106],[80,118],[0,118]], "#E5D5B7");
        polygon([[0,0],[113,0],[123,22],[101,39],[111,59],[88,70],[80,94],[49,118],[0,118]], "#D1BE9A");
        path([[174,0],[169,15],[156,27],[165,38],[146,47],[149,58],[130,70],[127,83],[109,91],[106,106],[80,118]], "#F6E9CE", 2);
        path([[45,0],[65,22],[57,38],[75,54],[57,73],[67,97],[49,118]], "#BAA782");
        path([[95,0],[85,29],[102,40],[90,60],[110,72]], "#BAA782");
        for (let arm = 0; arm < 5; arm++) {
          let previous;
          for (let i = 0; i <= 130; i++) {
            const t = i / 130; const radius = 5 + t * 57;
            const angle = arm * tau / 5 + t * tau * 1.1;
            const p = [195 + Math.cos(angle) * radius, 61 + Math.sin(angle) * radius * 0.78];
            if (previous) line(...previous, ...p, arm % 2 ? "#E7F1F0" : "#FFFFFF", 3);
            previous = p;
          }
        }
        ellipse(195, 61, 7, 7, "#D8E8E9"); ellipse(195, 61, 4, 4, "#B91C1C");
        for (let i = 0; i < 9; i++) line(241 + i * 7, 15 + i % 3 * 12, 236 + i * 7, 26 + i % 3 * 12, "#93C5FD");
        break;
      }
      case 3: {
        bg("#18181B");
        for (let y = 24; y < 113; y += 18) line(10, y, 197, y, "#34343A");
        for (let x = 10; x < 198; x += 23) line(x, 24, x, 111, "#34343A");
        const graph = [[11,48],[26,54],[40,48],[56,68],[72,57],[87,81],[103,66],[119,88],[137,78],[155,96],[174,88],[190,109]];
        polygon([...graph,[190,112],[11,112]], "#7F1D1D");
        path(graph, "#EF4444", 2);
        polygon([[190,109],[178,104],[188,98]], "#EF4444");
        line(202, 32, 202, 96, "#52525B");
        break;
      }
      case 4: {
        bg("#1E3A8A");
        for (let i = 0; i < 12; i++) ellipse(116 + Math.cos(i * tau / 12) * 16, 23 + Math.sin(i * tau / 12) * 16, 1.6, 1.6, "#FACC15");
        rect(143, 8, 40, 27, "#1E3A5F");
        line(144,9,182,34,"#FFFFFF",5); line(182,9,144,34,"#FFFFFF",5);
        line(144,9,182,34,"#DC2626",2); line(182,9,144,34,"#DC2626",2);
        rect(159,8,8,27,"#FFFFFF"); rect(143,18,40,8,"#FFFFFF");
        rect(161,8,4,27,"#DC2626"); rect(143,20,40,4,"#DC2626");
        break;
      }
      case 5: {
        bg("#DDE9DF"); ellipse(131,22,20,20,"#0F766E");
        polygon([[118,10],[131,6],[139,12],[136,20],[127,21],[121,31],[116,24]],"#A9C48C");
        polygon([[135,25],[143,23],[145,29],[138,39],[133,32]],"#A9C48C");
        arc(131,22,9,19,0,tau,"#91B9AA"); line(112,22,150,22,"#91B9AA");
        ellipse(163,24,13,13,"#FFFFFF"); arc(163,24,12,12,0,tau,"#8B1E24");
        line(163,24,163,15,"#DC2626",2); line(163,24,170,28,"#DC2626",2);
        break;
      }
      case 6: {
        bg("#BAC497"); polygon([[0,34],[28,24],[53,32],[91,23],[126,30],[155,22],[184,30],[184,44],[0,44]],"#4D7C0F");
        rect(0,24,72,7,"#FFFFFF"); rect(0,31,72,7,"#DC2626");
        line(149,7,119,31,"#263440",5); line(147,7,125,25,"#DEE3DC",2);
        polygon([[118,26],[115,35],[126,31]],"#DC2626"); polygon([[145,10],[154,9],[149,17]],"#263440");
        break;
      }
      case 7: {
        bg("#D6B88D"); polygon([[0,36],[58,29],[113,35],[150,28],[184,35],[184,44],[0,44]],"#C2A06C");
        for (const x of [84,122,160]) {
          rect(x-13,25,27,10,"#35432C"); ellipse(x-8,35,5,3,"#202A20"); ellipse(x+8,35,5,3,"#202A20");
          rect(x-5,20,12,7,"#4C583B"); line(x+2,22,x+20,18,"#35432C",2);
        }
        break;
      }
      case 8: {
        bg("#EEE2D4");
        for (let i=0;i<11;i++) { const x=76+i*10; ellipse(x,28+i%2*2,3,3,"#652B2B"); rect(x-3,32+i%2*2,6,12-i%2*2,"#7F1D1D"); }
        line(106,19,103,36,"#652B2B",2); line(167,18,170,36,"#652B2B",2);
        rect(102,13,71,14,"#991B1B");
        break;
      }
      case 9: {
        bg("#E5E7EB"); line(101,41,180,41,"#6B7280");
        [9,16,23,31].forEach((h,i)=>rect(109+i*18,41-h,11,h,"#8B1E24"));
        path([[104,26],[126,18],[143,22],[172,5]],"#DC2626",2);
        polygon([[172,5],[163,6],[170,14]],"#DC2626");
        break;
      }
      case 10: {
        bg("#B45309"); ellipse(98,21,14,14,"#D99B45");
        path([[139,42],[151,5],[164,42]],"#141414",3);
        for(let y=14;y<=36;y+=7) line(144-(y-14)*0.15,y,155+(y-14)*0.25,y,"#141414",2);
        line(142,16,162,36,"#141414",2); line(158,16,141,36,"#141414",2);
        rect(133,40,37,4,"#141414"); line(91,39,99,19,"#141414",3); line(88,20,123,13,"#141414",4); line(120,13,123,34,"#141414",2);
        break;
      }
      case 11: {
        bg("#1D4ED8"); rect(119,22,45,21,"#D8E1E7"); raster.border(...point([119,22]),45*sx,21*sy,"#141414");
        line(125,25,157,25,"#141414");
        polygon([[133,10],[145,5],[157,21],[143,26]],"#FFFFFF");
        line(139,15,145,19,"#166534",2); line(145,19,150,10,"#166534",2);
        break;
      }
      case 12: {
        bg("#ECE6DA"); rect(131,7,34,36,"#6B7280"); rect(128,7,40,5,"#9CA3AF");
        ellipse(148,28,10,13,"#ECE6DA"); rect(138,28,20,15,"#ECE6DA");
        rect(128,40,13,4,"#52525B"); rect(155,40,13,4,"#52525B");
        line(125,43,172,4,"#DC2626",4);
        break;
      }
      case 13: {
        bg("#0F172A");
        for(const r of [12,23,34]) arc(143,43,r,r,Math.PI,tau,"#C8A75A");
        line(143,43,174,13,"#E5C66C",2);
        for(const [x,y] of [[102,18],[121,10],[143,8],[165,15],[178,25]]) {
          line(x-4,y,x+4,y,"#DC2626",2); line(x,y-3,x,y+3,"#DC2626");
        }
        break;
      }
      case 14: {
        bg("#CDE2CE"); polygon([[102,6],[166,6],[181,43],[87,43]],"#15803D");
        path([[102,6],[166,6],[181,43],[87,43]],"#FFFFFF",1,true);
        path([[110,8],[159,8],[169,41],[99,41]],"#FFFFFF",1,true);
        line(95,25,173,25,"#FFFFFF",2); line(133,7,133,42,"#FFFFFF");
        ellipse(170,12,5,5,"#FACC15");
        break;
      }
      case 15: {
        bg("#09090B"); ellipse(107,69,106,37,"#1D5B79"); arc(107,69,106,37,Math.PI,tau,"#93C5FD",2);
        for(const [x,y] of [[81,18],[100,6],[183,8],[176,32],[95,32]]) rect(x,y,1,1,"#FFFFFF");
        rect(126,17,19,9,"#D6DCE1"); rect(104,12,17,19,"#1E3A5F"); rect(150,12,16,19,"#1E3A5F");
        for(const x of [109,114,119,155,160]) line(x,13,x,29,"#93C5FD");
        line(120,21,151,21,"#D6DCE1",2);
        polygon([[174,6],[167,17],[169,28],[180,28],[182,17]],"#FFFFFF"); rect(172,14,5,4,"#1D5B79");
        break;
      }
      case 16: {
        bg("#1E1B4B"); ellipse(147,22,18,18,"#38BDF8");
        arc(147,22,30,8,-0.4,Math.PI+0.4,"#B8E8F7",2);
        arc(149,22,11,17,Math.PI/2,Math.PI*1.5,"#7DD3FC",3);
        for(const [x,y] of [[105,17],[116,36],[177,8],[177,32],[95,7]]) { line(x-2,y,x+2,y,"#FFFFFF"); line(x,y-2,x,y+2,"#FFFFFF"); }
        break;
      }
      default: throw new Error(`No original illustration for pin ${story.id}`);
    }
  });
}
