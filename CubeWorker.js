"use strict";
(function() {
  function randomIntWithMax(max) {
    return Math.floor(Math.random()*max);
  }
  var d;
  function getTimer() {
    if (!d) {
      d = (new Date()).getTime();
      return 0;
    } else {
      var x = (new Date()).getTime();
      var y = x - d;
      d = x;
      return y;
    }
  }
  function sendConsoleMessage(msg) {
    postMessage({type: "message", msg: msg});
  }
  function sendProgressMessage(line) {
    postMessage({type: "progress", line: line, time: getTimer()});
  }
  function messageHandler(event) {
    if (event.data.type == "generateTables") {
      generateTables();
      postMessage({type: "CoordCube"});
    } else if (event.data.type == "verify") {
      postMessage({type: "verify", result: verify(event.data.cube), cube: event.data.cube});
    } else if (event.data.type == "random") {
      var random = randomCube();
      postMessage({type: "random", result: random});
      } else if (event.data.type == "generateTable") {
          generateTable(event.data.table, event.data);
    } else if (event.data.type == "CoordCube") {
      for (var i in event.data.cc) {
        if (i.indexOf("Slice") == 0) {
          CoordCube[i] = new Int8Array(event.data.cc[i]);
        } else {
          CoordCube[i] = event.data.cc[i];
        }
      }
    } else if (event.data.type == "solve") {
      var x = Search.solution(event.data.cube, event.data.maxDepth || 20, event.data.maxTime || 10, !!event.data.useSeparator);
      if (x.indexOf("Error") == -1) {
              x = x.substring(0,x.length - 1);
      }
      postMessage({type: "solution", result: x, cube: event.data.cube});
    }
  }
  addEventListener("message",messageHandler,false);
  function enumvar(number,string) {
    Object.defineProperty(this, "number", {
      value: number,
      enumerable: true
    });
    Object.defineProperty(this, "string", {
      value: string,
      enumerable: true
    });
  };
  enumvar.prototype.toString = function() {
    return this.string;
  };
  enumvar.prototype.ordinal = function() {
    return this.number;
  };
  function makeEnum(a) {
    var o = {};
    for (var i = 0; i < a.length; i++) {
      var x = new enumvar(i,a[i]);
      o[a[i]] = x;
      self[a[i]] = x;
    }
    Object.defineProperty(o, "valueOf", {
      value: function(a) {
        return this[a];
      },
      writable: false,
      configurable: false,
      enumerable: false
    });
    return o;
  }
  Number.prototype.ordinal = function() {
    return this+0;
  }
  var Color = makeEnum(["U", "R", "F", "D", "L", "B"]);
  var Facelet = makeEnum(["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"]);
  var Corner = makeEnum(["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"]);
  var Edge = makeEnum(["UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR"]);
  function verify(s) {
    // Check if the cube string s represents a solvable cube.
    // 0: Cube is solvable
    // -1: There is not exactly one facelet of each colour
    // -2: Not all 12 edges exist exactly once
    // -3: Flip error: One edge has to be flipped
    // -4: Not all corners exist exactly once
    // -5: Twist error: One corner has to be twisted
    // -6: Parity error: Two corners or two edges have to be exchanged
    var count = new Int32Array(6);
    try{
      for (var i = 0; i < 54; i++) {
        count[Color[s.charAt(i)].ordinal()]++;
      }
    }catch(e) {
      return -1;
    }
    for (var i = 0; i < 6; i++) {
      if (count[i] != 9) {
        return -1;
      }
    }
    var fc = new FaceCube(s);
    var cc = fc.toCubieCube();
    return cc.verify();
  }
  function randomCube() {
    var cc = new CubieCube();
    cc.setFlip(randomIntWithMax(N_FLIP));
    cc.setTwist(randomIntWithMax(N_TWIST));
    do {
      cc.setURFtoDLB(randomIntWithMax(N_URFtoDLB));
      cc.setURtoBR(randomIntWithMax(N_URtoBR));
    } while ((cc.edgeParity() ^ cc.cornerParity()) != 0);
    var fc = cc.toFaceCube();
    return fc.toString();
  }
  var cornerFacelet = [ [ U9, R1, F3 ], [ U7, F1, L3 ], [ U1, L1, B3 ], [ U3, B1, R3 ], [ D3, F9, R7 ], [ D1, L9, F7 ], [ D7, B9, L7 ], [ D9, R9, B7 ] ];
  var edgeFacelet = [ [ U6, R2 ], [ U8, F2 ], [ U4, L2 ], [ U2, B2 ], [ D6, R8 ], [ D2, F8 ], [ D4, L8 ], [ D8, B8 ], [ F6, R4 ], [ F4, L6 ], [ B6, L4 ], [ B4, R6 ] ];
  var cornerColor = [ [ U, R, F ], [ U, F, L ], [ U, L, B ], [ U, B, R ], [ D, F, R ], [ D, L, F ], [ D, B, L ], [ D, R, B ] ];
  var edgeColor = [ [ U, R ], [ U, F ], [ U, L ], [ U, B ], [ D, R ], [ D, F ], [ D, L ], [ D, B ], [ F, R ], [ F, L ], [ B, L ], [ B, R ] ];
  function FaceCube(s) {
    this.f = [];
    if (!s) {
      s = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    }
    for (var i = 0; i < 54; i++) {
      this.f[i] = Color[s.charAt(i)];
    }
  };
  FaceCube.prototype.toString = function() {
    var s = "";
    for (var i = 0; i < 54; i++) {
      s += this.f[i].toString();
    }
    return s;
  };
  FaceCube.prototype.toCubieCube = function() {
    var ori;
    var ccRet = new CubieCube();
    for (var i = 0; i < 8; i++)
      ccRet.cp[i] = URF;// invalidate corners
    for (var i = 0; i < 12; i++)
      ccRet.ep[i] = UR;// and edges
    var col1, col2;
    for (var i in Corner) {
      i = Corner[i];
      // get the colors of the cubie at corner i, starting with U/D
      for (ori = 0; ori < 3; ori++)
        if (this.f[cornerFacelet[i.ordinal()][ori].ordinal()] == U || this.f[cornerFacelet[i.ordinal()][ori].ordinal()] == D)
          break;
      col1 = this.f[cornerFacelet[i.ordinal()][(ori + 1) % 3].ordinal()];
      col2 = this.f[cornerFacelet[i.ordinal()][(ori + 2) % 3].ordinal()];

      for (var j in Corner) {
        j = Corner[j];
        if (col1 == cornerColor[j.ordinal()][1] && col2 == cornerColor[j.ordinal()][2]) {
          // in cornerposition i we have cornercubie j
          ccRet.cp[i.ordinal()] = j;
          ccRet.co[i.ordinal()] = (ori % 3);
          break;
        }
      }
    }
    for (var i in Edge) {
      i = Edge[i];
      for (var j in Edge) {
        j = Edge[j];
        if (this.f[edgeFacelet[i.ordinal()][0].ordinal()].toString() == edgeColor[j.ordinal()][0].toString()
            && this.f[edgeFacelet[i.ordinal()][1].ordinal()].toString() == edgeColor[j.ordinal()][1].toString()) {
          ccRet.ep[i.ordinal()] = j;
          ccRet.eo[i.ordinal()] = 0;
          break;
        }
        if (this.f[edgeFacelet[i.ordinal()][0].ordinal()].toString() == edgeColor[j.ordinal()][1].toString()
            && this.f[edgeFacelet[i.ordinal()][1].ordinal()].toString() == edgeColor[j.ordinal()][0].toString()) {
          ccRet.ep[i.ordinal()] = j;
          ccRet.eo[i.ordinal()] = 1;
          break;
        }
      }
    }
    return ccRet;
  };
  function Cnk(n, k) {
    // n choose k
    var i, j, s;
    if (n < k)
      return 0;
    if (k > (n / 2) | 0)
      k = n - k;
    for (s = 1, i = n, j = 1; i != n - k; i--, j++) {
      s *= i;
      s /= j;
      s = s | 0;
    }
    return s;
  }
  function CubieCube(cp,co,ep,eo) {
    if (cp && co && ep && eo) {
      this.cp = cp;
      this.co = new Int8Array(co);
      this.ep = ep;
      this.eo = new Int8Array(eo);
    } else {
      this.cp = [ URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB ];
      this.co = new Int8Array([ 0, 0, 0, 0, 0, 0, 0, 0 ]);
      this.ep = [ UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR ];
      this.eo = new Int8Array([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
    }
  }
  CubieCube.prototype.rotateLeft = function(arr, l, r)
  // Left rotation of all array elements between l and r
  {
    var temp = arr[l];
    for (var i = l; i < r; i++)
      arr[i] = arr[i + 1];
    arr[r] = temp;
  };
  CubieCube.prototype.rotateRight = function(arr, l, r)
  // Right rotation of all array elements between l and r
  {
    var temp = arr[r];
    for (var i = r; i > l; i--)
      arr[i] = arr[i - 1];
    arr[l] = temp;
  };
  CubieCube.prototype.toFaceCube = function() {
    var fcRet = new FaceCube();
    for (var c in Corner) {
      c = Corner[c];
      var i = c.ordinal();
      var j = this.cp[i].ordinal();// cornercubie with index j is at
      // cornerposition with index i
      var ori = this.co[i];// Orientation of this cubie
      for (var n = 0; n < 3; n++)
        fcRet.f[cornerFacelet[i][(n + ori) % 3].ordinal()] = cornerColor[j][n];
    }
    for (var e in Edge) {
      e = Edge[e];
      var i = e.ordinal();
      var j = this.ep[i].ordinal();// edgecubie with index j is at edgeposition
      // with index i
      var ori = this.eo[i];// Orientation of this cubie
      for (var n = 0; n < 2; n++)
        fcRet.f[edgeFacelet[i][(n + ori) % 2].ordinal()] = edgeColor[j][n];
    }
    return fcRet;
  };
  CubieCube.prototype.cornerMultiply = function(b) {
    var cPerm = [];
    var cOri = new Int8Array(8);
    for (var corn in Corner) {
      corn = Corner[corn];
      cPerm[corn.ordinal()] = this.cp[b.cp[corn.ordinal()].ordinal()];

      var oriA = this.co[b.cp[corn.ordinal()].ordinal()];
      var oriB = b.co[corn.ordinal()].ordinal();
      var ori = 0;
      if (oriA < 3 && oriB < 3) // if both cubes are regular cubes...
      {
        ori = (oriA + oriB); // just do an addition modulo 3 here
        if (ori >= 3)
          ori -= 3; // the composition is a regular cube

        // +++++++++++++++++++++not used in this implementation +++++++++++++++++++++++++++++++++++
      } else if (oriA < 3 && oriB >= 3) // if cube b is in a mirrored
      // state...
      {
        ori = (oriA + oriB);
        if (ori >= 6)
          ori -= 3; // the composition is a mirrored cube
      } else if (oriA >= 3 && oriB < 3) // if cube a is an a mirrored
      // state...
      {
        ori = (oriA - oriB);
        if (ori < 3)
          ori += 3; // the composition is a mirrored cube
      } else if (oriA >= 3 && oriB >= 3) // if both cubes are in mirrored
      // states...
      {
        ori = (oriA - oriB);
        if (ori < 0)
          ori += 3; // the composition is a regular cube
        // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
      }
      cOri[corn.ordinal()] = ori;
    }
    for (var c in Corner) {
      c = Corner[c];
      this.cp[c.ordinal()] = cPerm[c.ordinal()];
      this.co[c.ordinal()] = cOri[c.ordinal()];
    }
  };
  CubieCube.prototype.multiply = function(b) {
     this.cornerMultiply(b);
  };
  CubieCube.prototype.edgeMultiply = function(b) {
    var ePerm = [];
    var eOri = new Int8Array(12);
    for (var edge in Edge) {
      edge = Edge[edge];
      ePerm[edge.ordinal()] = this.ep[b.ep[edge.ordinal()].ordinal()];
      eOri[edge.ordinal()] = ((b.eo[edge.ordinal()] + this.eo[b.ep[edge.ordinal()].ordinal()]) % 2);
    }
    for (var e in Edge) {
      e = Edge[e];
      this.ep[e.ordinal()] = ePerm[e.ordinal()];
      this.eo[e.ordinal()] = eOri[e.ordinal()];
    }
  };
  CubieCube.prototype.invCubieCube = function(c) {
    for (var edge in Edge) {
      edge = Edge[edge];
      c.ep[this.ep[edge.ordinal()].ordinal()] = edge;
    }
    for (var edge in Edge) {
      edge = Edge[edge];
      c.eo[edge.ordinal()] = this.eo[c.ep[edge.ordinal()].ordinal()];
    }
    for (var corn in Corner) {
      corn = Corner[corn];
      c.cp[this.cp[corn.ordinal()].ordinal()] = corn;
    }
    for (var corn in Corner) {
      corn = Corner[corn];
      var ori = this.co[c.cp[corn.ordinal()].ordinal()];
      if (ori >= 3)// Just for completeness. We do not invert mirrored
        // cubes in the program.
        c.co[corn.ordinal()] = ori;
      else {// the standard case
        c.co[corn.ordinal()] = -ori;
        if (c.co[corn.ordinal()] < 0)
          c.co[corn.ordinal()] += 3;
      }
    }
  };
  CubieCube.prototype.getTwist = function() {
    var ret = 0;
    for (var i = URF.ordinal(); i < DRB.ordinal(); i++)
      ret = (3 * ret + this.co[i]);
    return ret;
  };
  CubieCube.prototype.setTwist = function(twist) {
    var twistParity = 0;
    for (var i = DRB.ordinal() - 1; i >= URF.ordinal(); i--) {
      twistParity += this.co[i] = (twist % 3);
      twist /= 3;
      twist = twist | 0;
    }
    this.co[DRB.ordinal()] = ((3 - twistParity % 3) % 3);
  };
  CubieCube.prototype.getFlip = function() {
    var ret = 0;
    for (var i = UR.ordinal(); i < BR.ordinal(); i++)
      ret = (2 * ret + this.eo[i]);
    return ret;
  };
  CubieCube.prototype.setFlip = function(flip) {
    var flipParity = 0;
    for (var i = BR.ordinal() - 1; i >= UR.ordinal(); i--) {
      flipParity += this.eo[i] = (flip % 2);
      flip /= 2;
      flip = flip | 0;
    }
    this.eo[BR.ordinal()] = ((2 - flipParity % 2) % 2);
  };
  CubieCube.prototype.cornerParity = function() {
    var s = 0;
    for (var i = DRB.ordinal(); i >= URF.ordinal() + 1; i--)
      for (var j = i - 1; j >= URF.ordinal(); j--)
        if (this.cp[j].ordinal() > this.cp[i].ordinal())
          s++;
    return (s % 2);
  };
  CubieCube.prototype.edgeParity = function() {
    var s = 0;
    for (var i = BR.ordinal(); i >= UR.ordinal() + 1; i--)
      for (var j = i - 1; j >= UR.ordinal(); j--)
        if (this.ep[j].ordinal() > this.ep[i].ordinal())
          s++;
    return (s % 2);
  };
  CubieCube.prototype.getFRtoBR = function() {
    var a = 0, x = 0;
    var edge4 = [];
    // compute the index a < (12 choose 4) and the permutation array perm.
    for (var j = BR.ordinal(); j >= UR.ordinal(); j--)
      if (FR.ordinal() <= this.ep[j].ordinal() && this.ep[j].ordinal() <= BR.ordinal()) {
        a += Cnk(11 - j, x + 1);
        edge4[3 - x++] = this.ep[j];
      }

    var b = 0;
    for (var j = 3; j > 0; j--)// compute the index b < 4! for the
    // permutation in perm
    {
      var k = 0;
      while (edge4[j].ordinal() != j + 8) {
        this.rotateLeft(edge4, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return (24 * a + b);
  };
  CubieCube.prototype.setFRtoBR = function(idx) {
    var x;
    var sliceEdge = [ FR, FL, BL, BR ];
    var otherEdge = [ UR, UF, UL, UB, DR, DF, DL, DB ];
    var b = idx % 24; // Permutation
    var a = (idx / 24) | 0; // Combination
    for (var e in Edge) {
      e = Edge[e];
      this.ep[e.ordinal()] = DB;// Use UR to invalidate all edges
    }

    for (var j = 1, k; j < 4; j++)// generate permutation from index b
    {
      k = b % (j + 1);
      b /= j + 1;
      b = b | 0;
      while (k-- > 0)
        this.rotateRight(sliceEdge, 0, j);
    }

    x = 3;// generate combination and set slice edges
    for (var j = UR.ordinal(); j <= BR.ordinal(); j++)
      if (a - Cnk(11 - j, x + 1) >= 0) {
        this.ep[j] = sliceEdge[3 - x];
        a -= Cnk(11 - j, x-- + 1);
      }
    x = 0; // set the remaining edges UR..DB
    for (var j = UR.ordinal(); j <= BR.ordinal(); j++)
      if (this.ep[j] == DB)
        this.ep[j] = otherEdge[x++];

  };
  CubieCube.prototype.getURFtoDLF = function() {
    var a = 0, x = 0;
    var corner6 = [];
    // compute the index a < (8 choose 6) and the corner permutation.
    for (var j = URF.ordinal(); j <= DRB.ordinal(); j++)
      if (this.cp[j].ordinal() <= DLF.ordinal()) {
        a += Cnk(j, x + 1);
        corner6[x++] = this.cp[j];
      }

    var b = 0;
    for (var j = 5; j > 0; j--)// compute the index b < 6! for the
    // permutation in corner6
    {
      var k = 0;
      while (corner6[j].ordinal() != j) {
        this.rotateLeft(corner6, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return (720 * a + b);
  };
  CubieCube.prototype.setURFtoDLF = function(idx) {
    var x;
    var corner6 = [ URF, UFL, ULB, UBR, DFR, DLF ];
    var otherCorner = [ DBL, DRB ];
    var b = idx % 720; // Permutation
    var a = (idx / 720) | 0; // Combination
    for (var c in Corner) {
      c = Corner[c];
      this.cp[c.ordinal()] = DRB;// Use DRB to invalidate all corners
    }

    for (var j = 1, k; j < 6; j++)// generate permutation from index b
    {
      k = b % (j + 1);
      b /= j + 1;
      b = b | 0;
      while (k-- > 0)
        this.rotateRight(corner6, 0, j);
    }
    x = 5;// generate combination and set corners
    for (var j = DRB.ordinal(); j >= 0; j--)
      if (a - Cnk(j, x + 1) >= 0) {
        this.cp[j] = corner6[x];
        a -= Cnk(j, x-- + 1);
      }
    x = 0;
    for (var j = URF.ordinal(); j <= DRB.ordinal(); j++)
      if (this.cp[j] == DRB)
        this.cp[j] = otherCorner[x++];
  };
  CubieCube.prototype.getURtoDF = function() {
    var a = 0, x = 0;
    var edge6 = [];
    // compute the index a < (12 choose 6) and the edge permutation.
    for (var j = UR.ordinal(); j <= BR.ordinal(); j++)
      if (this.ep[j].ordinal() <= DF.ordinal()) {
        a += Cnk(j, x + 1);
        edge6[x++] = this.ep[j];
      }

    var b = 0;
    for (var j = 5; j > 0; j--)// compute the index b < 6! for the
    // permutation in edge6
    {
      var k = 0;
      while (edge6[j].ordinal() != j) {
        this.rotateLeft(edge6, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return 720 * a + b;
  };
  CubieCube.prototype.setURtoDF = function(idx) {
    var x;
    var edge6 = [ UR, UF, UL, UB, DR, DF ];
    var otherEdge = [ DL, DB, FR, FL, BL, BR ];
    var b = idx % 720; // Permutation
    var a = (idx / 720) | 0; // Combination
    for (var e in Edge) {
      e = Edge[e];
      this.ep[e.ordinal()] = BR;// Use BR to invalidate all edges
    }

    for (var j = 1, k; j < 6; j++)// generate permutation from index b
    {
      k = b % (j + 1);
      b /= j + 1;
      b = b | 0;
      while (k-- > 0)
        this.rotateRight(edge6, 0, j);
    }
    x = 5;// generate combination and set edges
    for (var j = BR.ordinal(); j >= 0; j--)
      if (a - Cnk(j, x + 1) >= 0) {
        this.ep[j] = edge6[x];
        a -= Cnk(j, x-- + 1);
      }
    x = 0; // set the remaining edges DL..BR
    for (var j = UR.ordinal(); j <= BR.ordinal(); j++)
      if (this.ep[j] == BR)
        this.ep[j] = otherEdge[x++];
  };
  CubieCube.prototype.getURtoUL = function() {
    var a = 0, x = 0;
    var edge3 = [];
    // compute the index a < (12 choose 3) and the edge permutation.
    for (var j = UR.ordinal(); j <= BR.ordinal(); j++)
      if (this.ep[j].ordinal() <= UL.ordinal()) {
        a += Cnk(j, x + 1);
        edge3[x++] = this.ep[j];
      }

    var b = 0;
    for (var j = 2; j > 0; j--)// compute the index b < 3! for the
    // permutation in edge3
    {
      var k = 0;
      while (edge3[j].ordinal() != j) {
        this.rotateLeft(edge3, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return (6 * a + b);
  };
  CubieCube.prototype.setURtoUL = function(idx) {
    var x;
    var edge3 = [ UR, UF, UL ];
    var b = idx % 6; // Permutation
    var a = (idx / 6) | 0; // Combination
    for (var e in Edge) {
      e = Edge[e];
      this.ep[e.ordinal()] = BR;// Use BR to invalidate all edges
    }

    for (var j = 1, k; j < 3; j++)// generate permutation from index b
    {
      k = b % (j + 1);
      b /= j + 1;
      b = b | 0;
      while (k-- > 0)
        this.rotateRight(edge3, 0, j);
    }
    x = 2;// generate combination and set edges
    for (var j = BR.ordinal(); j >= 0; j--)
      if (a - Cnk(j, x + 1) >= 0) {
        this.ep[j] = edge3[x];
        a -= Cnk(j, x-- + 1);
      }
  };
  CubieCube.prototype.getUBtoDF = function() {
    var a = 0, x = 0;
    var edge3 = [];
    // compute the index a < (12 choose 3) and the edge permutation.
    for (var j = UR.ordinal(); j <= BR.ordinal(); j++)
      if (UB.ordinal() <= this.ep[j].ordinal() && this.ep[j].ordinal() <= DF.ordinal()) {
        a += Cnk(j, x + 1);
        edge3[x++] = this.ep[j];
      }

    var b = 0;
    for (var j = 2; j > 0; j--)// compute the index b < 3! for the
    // permutation in edge3
    {
      var k = 0;
      while (edge3[j].ordinal() != UB.ordinal() + j) {
        this.rotateLeft(edge3, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return (6 * a + b);
  };
  CubieCube.prototype.setUBtoDF = function(idx) {
    var x;
    var edge3 = [ UB, DR, DF ];
    var b = idx % 6; // Permutation
    var a = (idx / 6) | 0; // Combination
    for (var e in Edge) {
      e = Edge[e];
      this.ep[e.ordinal()] = BR;// Use BR to invalidate all edges
    }

    for (var j = 1, k; j < 3; j++)// generate permutation from index b
    {
      k = b % (j + 1);
      b /= j + 1;
      b = b | 0;
      while (k-- > 0)
        this.rotateRight(edge3, 0, j);
    }
    x = 2;// generate combination and set edges
    for (var j = BR.ordinal(); j >= 0; j--)
      if (a - Cnk(j, x + 1) >= 0) {
        this.ep[j] = edge3[x];
        a -= Cnk(j, x-- + 1);
      }
  };
  CubieCube.prototype.getURFtoDLB = function() {
    var perm = [];
    var b = 0;
    for (var i = 0; i < 8; i++)
      perm[i] = this.cp[i];
    for (var j = 7; j > 0; j--)// compute the index b < 8! for the permutation in perm
    {
      var k = 0;
      while (perm[j].ordinal() != j) {
        this.rotateLeft(perm, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return b;
  };
  CubieCube.prototype.setURFtoDLB = function(idx) {
    var perm = [ URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB ];
    var k;
    for (var j = 1; j < 8; j++) {
      k = idx % (j + 1);
      idx /= j + 1;
      idx = idx | 0;
      while (k-- > 0)
        this.rotateRight(perm, 0, j);
    }
    var x = 7;// set corners
    for (var j = 7; j >= 0; j--)
      this.cp[j] = perm[x--];
  };
  CubieCube.prototype.getURtoBR = function() {
    var perm = [];
    var b = 0;
    for (var i = 0; i < 12; i++)
      perm[i] = this.ep[i];
    for (var j = 11; j > 0; j--)// compute the index b < 12! for the permutation in perm
    {
      var k = 0;
      while (perm[j].ordinal() != j) {
        this.rotateLeft(perm, 0, j);
        k++;
      }
      b = (j + 1) * b + k;
    }
    return b;
  };
  CubieCube.prototype.setURtoBR = function(idx) {
    var perm = [ UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR ];
    var k;
    for (var j = 1; j < 12; j++) {
      k = idx % (j + 1);
      idx /= j + 1;
      idx = idx | 0;
      while (k-- > 0)
        this.rotateRight(perm, 0, j);
    }
    var x = 11;// set edges
    for (var j = 11; j >= 0; j--)
      this.ep[j] = perm[x--];
  };
  // Check a cubiecube for solvability. Return the error code.
  // 0: Cube is solvable
  // -2: Not all 12 edges exist exactly once
  // -3: Flip error: One edge has to be flipped
  // -4: Not all corners exist exactly once
  // -5: Twist error: One corner has to be twisted
  // -6: Parity error: Two corners ore two edges have to be exchanged
  CubieCube.prototype.verify = function() {
    var sum = 0;
    var edgeCount = new Int32Array(12);
    for (var e in Edge) {
      e = Edge[e];
      edgeCount[this.ep[e.ordinal()].ordinal()]++;
    }
    for (var i = 0; i < 12; i++)
      if (edgeCount[i] != 1)
        return -2;

    for (var i = 0; i < 12; i++)
      sum += this.eo[i];
    if (sum % 2 != 0)
      return -3;

    var cornerCount = new Int32Array(8);
    for (var c in Corner) {
      c = Corner[c];
      cornerCount[this.cp[c.ordinal()].ordinal()]++;
    }
    for (var i = 0; i < 8; i++)
      if (cornerCount[i] != 1)
        return -4;// missing corners

    sum = 0;
    for (var i = 0; i < 8; i++) {
      sum += this.co[i];
    }
    if (sum % 3 != 0) {
      return -5;// twisted corner
    }
    if ((this.edgeParity() ^ this.cornerParity()) != 0)
      return -6;// parity error

    return 0;// cube ok
  };
  CubieCube.getURtoDF = function(idx1, idx2) {
    var a = new CubieCube();
    var b = new CubieCube();
    a.setURtoUL(idx1);
    b.setUBtoDF(idx2);
    for (var i = 0; i < 8; i++) {
      if (a.ep[i] != BR)
        if (b.ep[i] != BR)// collision
          return -1;
        else
          b.ep[i] = a.ep[i];
    }
    return b.getURtoDF();
  }
  CubieCube.moveCube = [
    new CubieCube([UBR, URF, UFL, ULB, DFR, DLF, DBL, DRB],[0, 0, 0, 0, 0, 0, 0, 0],[UB, UR, UF, UL, DR, DF, DL, DB, FR, FL, BL, BR],[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new CubieCube([DFR, UFL, ULB, URF, DRB, DLF, DBL, UBR],[2, 0, 0, 1, 1, 0, 0, 2],[FR, UF, UL, UB, BR, DF, DL, DB, DR, FL, BL, UR],[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new CubieCube([UFL, DLF, ULB, UBR, URF, DFR, DBL, DRB],[1, 2, 0, 0, 2, 1, 0, 0],[UR, FL, UL, UB, DR, FR, DL, DB, UF, DF, BL, BR],[0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0]),
    new CubieCube([URF, UFL, ULB, UBR, DLF, DBL, DRB, DFR],[0, 0, 0, 0, 0, 0, 0, 0],[UR, UF, UL, UB, DF, DL, DB, DR, FR, FL, BL, BR],[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new CubieCube([URF, ULB, DBL, UBR, DFR, UFL, DLF, DRB],[0, 1, 2, 0, 0, 2, 1, 0],[UR, UF, BL, UB, DR, DF, FL, DB, FR, UL, DL, BR],[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new CubieCube([URF, UFL, UBR, DRB, DFR, DLF, ULB, DBL],[0, 0, 1, 2, 0, 0, 2, 1],[UR, UF, UL, BR, DR, DF, DL, BL, FR, FL, UB, DB],[0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1])
  ];
  var N_TWIST = 2187;
  var N_FLIP = 2048;
  var N_SLICE1 = 495;
  var N_SLICE2 = 24;
  var N_PARITY = 2;
  var N_URFtoDLF = 20160;
  var N_FRtoBR = 11880;
  var N_URtoUL = 1320;
  var N_UBtoDF = 1320;
  var N_URtoDF = 20160;
  var N_URFtoDLB = 40320;
  var N_URtoBR = 479001600;
  var N_MOVE = 18;
  function CoordCube(c) {
    this.twist = c.getTwist();
    this.flip = c.getFlip();
    this.parity = c.cornerParity();
    this.FRtoBR = c.getFRtoBR();
    this.URFtoDLF = c.getURFtoDLF();
    this.URtoUL = c.getURtoUL();
    this.UBtoDF = c.getUBtoDF();
    this.URtoDF = c.getURtoDF();
    this.move = function(m) {
      this.twist = CoordCube.twistMove[this.twist][m];
      this.flip = CoordCube.flipMove[this.flip][m];
      this.parity = CoordCube.parityMove[this.parity][m];
      this.FRtoBR = CoordCube.FRtoBR_Move[this.FRtoBR][m];
      this.URFtoDLF = CoordCube.URFtoDLF_Move[this.URFtoDLF][m];
      this.URtoUL = CoordCube.URtoUL_Move[this.URtoUL][m];
      this.UBtoDF = CoordCube.UBtoDF_Move[this.UBtoDF][m];
      if (this.URtoUL < 336 && this.UBtoDF < 336)// updated only if UR,UF,UL,UB,DR,DF
        // are not in UD-slice
        this.URtoDF = CoordCube.MergeURtoULandUBtoDF[this.URtoUL][this.UBtoDF];
    }
  }
  CoordCube.parityMove = [
      new Int16Array([ 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1 ]),
      new Int16Array([ 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ])
  ];
  CoordCube.N_TWIST = 2187;
  CoordCube.N_FLIP = 2048;
  CoordCube.N_SLICE1 = 495;
  CoordCube.N_SLICE2 = 24;
  CoordCube.N_PARITY = 2;
  CoordCube.N_URFtoDLF = 20160;
  CoordCube.N_FRtoBR = 11880;
  CoordCube.N_URtoUL = 1320;
  CoordCube.N_UBtoDF = 1320;
  CoordCube.N_URtoDF = 20160;
  CoordCube.N_URFtoDLB = 40320;
  CoordCube.N_URtoBR = 479001600;
  CoordCube.N_MOVE = 18;
  CoordCube.setPruning = function(table,index,value) {
      if ((index & 1) == 0)
          table[index / 2] &= 0xf0 | value;
      else
          table[(index / 2) | 0] &= 0x0f | (value << 4);
  }
  CoordCube.getPruning = function(table,index) {
      if ((index & 1) == 0)
          return (table[index / 2] & 0x0f);
      else
          return ((table[(index / 2) | 0] & 0xf0) >>> 4);
  }
  function generateArray(a,c,d) {
    var b = [];
    for (var i = 0; i < a; i++) {
      if (c) {
        b[i] = new c(d);
      } else {
        b.push([]);
      }
    }
    return b;
  }
  function generateTwistMove() {
      var twistMove = generateArray(N_TWIST);
    var a = new CubieCube();
    for (var i = 0; i < N_TWIST; i++) {
      a.setTwist(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.cornerMultiply(CubieCube.moveCube[j]);
          twistMove[i][3 * j + k] = a.getTwist();
        }
        a.cornerMultiply(CubieCube.moveCube[j]);// 4. faceturn restores
        // a
      }
    }
    return twistMove;
  }
  function generateFlipMove() {
      var flipMove = generateArray(N_FLIP);
    var a = new CubieCube();
    for (var i = 0; i < N_FLIP; i++) {
      a.setFlip(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.edgeMultiply(CubieCube.moveCube[j]);
          flipMove[i][3 * j + k] = a.getFlip();
        }
        a.edgeMultiply(CubieCube.moveCube[j]);
        // a
      }
    }
    return flipMove;
  }
  function generateFRtoBR_Move() {
    var FRtoBR_Move = generateArray(N_FRtoBR,Int16Array,N_MOVE);
    var a = new CubieCube();
    for (var i = 0; i < N_FRtoBR; i++) {
      a.setFRtoBR(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.edgeMultiply(CubieCube.moveCube[j]);
          FRtoBR_Move[i][3 * j + k] = a.getFRtoBR();
        }
        a.edgeMultiply(CubieCube.moveCube[j]);
      }
    }
    return FRtoBR_Move;
  }
  function generateURFtoDLF_Move() {
    var URFtoDLF_Move = generateArray(N_URFtoDLF,Int16Array,N_MOVE);
    var a = new CubieCube();
    for (var i = 0; i < N_URFtoDLF; i++) {
      a.setURFtoDLF(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.cornerMultiply(CubieCube.moveCube[j]);
          URFtoDLF_Move[i][3 * j + k] = a.getURFtoDLF();
        }
        a.cornerMultiply(CubieCube.moveCube[j]);
      }
    }
    return URFtoDLF_Move;
  }
  function generateURtoDF_Move() {
    var URtoDF_Move = generateArray(N_URtoDF,Int16Array,N_MOVE);
    var a = new CubieCube();
    for (var i = 0; i < N_URtoDF; i++) {
      a.setURtoDF(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.edgeMultiply(CubieCube.moveCube[j]);
          URtoDF_Move[i][3 * j + k] = a.getURtoDF();
          // Table values are only valid for phase 2 moves!
          // For phase 1 moves, casting to short is not possible.
        }
        a.edgeMultiply(CubieCube.moveCube[j]);
      }
    }
    return URtoDF_Move;
  }
  function generateURtoUL_Move() {
    var URtoUL_Move = generateArray(N_URtoUL,Int16Array,N_MOVE);
    var a = new CubieCube();
    for (var i = 0; i < N_URtoUL; i++) {
      a.setURtoUL(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.edgeMultiply(CubieCube.moveCube[j]);
          URtoUL_Move[i][3 * j + k] = a.getURtoUL();
        }
        a.edgeMultiply(CubieCube.moveCube[j]);
      }
    }
    return URtoUL_Move;
  }
  function generateUBtoDF_Move() {
    var UBtoDF_Move = generateArray(N_UBtoDF,Int16Array,N_MOVE);
    var a = new CubieCube();
    for (var i = 0; i < N_UBtoDF; i++) {
      a.setUBtoDF(i);
      for (var j = 0; j < 6; j++) {
        for (var k = 0; k < 3; k++) {
          a.edgeMultiply(CubieCube.moveCube[j]);
          UBtoDF_Move[i][3 * j + k] = a.getUBtoDF();
        }
        a.edgeMultiply(CubieCube.moveCube[j]);
      }
    }
    return UBtoDF_Move;
  }
  function generateMergeURtoULandUBtoDF() {
    var MergeURtoULandUBtoDF = generateArray(336,Int16Array,336);
    for (var uRtoUL = 0; uRtoUL < 336; uRtoUL++) {
      for (var uBtoDF = 0; uBtoDF < 336; uBtoDF++) {
        MergeURtoULandUBtoDF[uRtoUL][uBtoDF] = CubieCube.getURtoDF(uRtoUL, uBtoDF);
      }
    }
    return MergeURtoULandUBtoDF;
  }
  function generateSlice_URFtoDLF_Parity_Prun(FRtoBR_Move, URFtoDLF_Move) {
    var Slice_URFtoDLF_Parity_Prun = new Int8Array((N_SLICE2 * N_URFtoDLF * N_PARITY / 2) | 0);
    for (var i = 0; i < (N_SLICE2 * N_URFtoDLF * N_PARITY / 2) | 0; i++)
      Slice_URFtoDLF_Parity_Prun[i] = -1;
    var depth = 0;
    CoordCube.setPruning(Slice_URFtoDLF_Parity_Prun, 0, 0);
    var done = 1;
    while (done != N_SLICE2 * N_URFtoDLF * N_PARITY) {
      for (var i = 0; i < N_SLICE2 * N_URFtoDLF * N_PARITY; i++) {
        var parity = i % 2;
        var URFtoDLF = (((i / 2) | 0) / N_SLICE2) | 0;
        var slice = (((i / 2) | 0) % N_SLICE2);
        if (CoordCube.getPruning(Slice_URFtoDLF_Parity_Prun, i) == depth) {
          for (var j = 0; j < 18; j++) {
            switch (j) {
            case 3:
            case 5:
            case 6:
            case 8:
            case 12:
            case 14:
            case 15:
            case 17:
              continue;
            default:
              var newSlice = FRtoBR_Move[slice][j];
              var newURFtoDLF = URFtoDLF_Move[URFtoDLF][j];
              var newParity = CoordCube.parityMove[parity][j];
              if (CoordCube.getPruning(Slice_URFtoDLF_Parity_Prun, (N_SLICE2 * newURFtoDLF + newSlice) * 2 + newParity) == 0x0f) {
                CoordCube.setPruning(Slice_URFtoDLF_Parity_Prun, (N_SLICE2 * newURFtoDLF + newSlice) * 2 + newParity, (depth + 1));
                done++;
              }
            }
          }
        }
      }
      depth++;
    }
    return Slice_URFtoDLF_Parity_Prun;
  }
  function generateSlice_URtoDF_Parity_Prun(FRtoBR_Move, URtoDF_Move) {
    var Slice_URtoDF_Parity_Prun = new Int8Array((N_SLICE2 * N_URtoDF * N_PARITY / 2) | 0);
    for (var i = 0; i < (N_SLICE2 * N_URtoDF * N_PARITY / 2) | 0; i++)
      Slice_URtoDF_Parity_Prun[i] = -1;
    var depth = 0;
    CoordCube.setPruning(Slice_URtoDF_Parity_Prun, 0, 0);
    var done = 1;
    while (done != N_SLICE2 * N_URtoDF * N_PARITY) {
      for (var i = 0; i < N_SLICE2 * N_URtoDF * N_PARITY; i++) {
        var parity = i % 2;
        var URtoDF = (((i / 2) | 0) / N_SLICE2) | 0;
        var slice = (((i / 2) | 0) % N_SLICE2);
        if (CoordCube.getPruning(Slice_URtoDF_Parity_Prun, i) == depth) {
          for (var j = 0; j < 18; j++) {
            switch (j) {
            case 3:
            case 5:
            case 6:
            case 8:
            case 12:
            case 14:
            case 15:
            case 17:
              continue;
            default:
              var newSlice = FRtoBR_Move[slice][j];
              var newURtoDF = URtoDF_Move[URtoDF][j];
              var newParity = CoordCube.parityMove[parity][j];
              if (CoordCube.getPruning(Slice_URtoDF_Parity_Prun, (N_SLICE2 * newURtoDF + newSlice) * 2 + newParity) == 0x0f) {
                CoordCube.setPruning(Slice_URtoDF_Parity_Prun, (N_SLICE2 * newURtoDF + newSlice) * 2 + newParity,
                  (depth + 1));
                done++;
              }
            }
          }
        }
      }
      depth++;
    }
    return Slice_URtoDF_Parity_Prun;
  }
  function generateSlice_Twist_Prun(FRtoBR_Move, twistMove) {
      var Slice_Twist_Prun = new Int8Array((N_SLICE1 * N_TWIST / 2 + 1) | 0);
    for (var i = 0; i < (N_SLICE1 * N_TWIST / 2 + 1) | 0; i++)
      Slice_Twist_Prun[i] = -1;
    var depth = 0;
    CoordCube.setPruning(Slice_Twist_Prun, 0, 0);
    var done = 1;
    while (done != N_SLICE1 * N_TWIST) {
      for (var i = 0; i < N_SLICE1 * N_TWIST; i++) {
        var twist = (i / N_SLICE1) | 0, slice = i % N_SLICE1;
        if (CoordCube.getPruning(Slice_Twist_Prun, i) == depth) {
          for (var j = 0; j < 18; j++) {
            var newSlice = (FRtoBR_Move[slice * 24][j] / 24) | 0;
            var newTwist = twistMove[twist][j];
            if (CoordCube.getPruning(Slice_Twist_Prun, N_SLICE1 * newTwist + newSlice) == 0x0f) {
              CoordCube.setPruning(Slice_Twist_Prun, N_SLICE1 * newTwist + newSlice, (depth + 1));
              done++;
            }
          }
        }
      }
      depth++;
    }
    return Slice_Twist_Prun;
  }
  function generateSlice_Flip_Prun(FRtoBR_Move, flipMove) {
      var Slice_Flip_Prun = new Int8Array((N_SLICE1 * N_FLIP / 2) | 0);
    for (var i = 0; i < (N_SLICE1 * N_FLIP / 2) | 0; i++)
      Slice_Flip_Prun[i] = -1;
    var depth = 0;
    CoordCube.setPruning(Slice_Flip_Prun, 0, 0);
    var done = 1;
    while (done != N_SLICE1 * N_FLIP) {
      for (var i = 0; i < N_SLICE1 * N_FLIP; i++) {
        var flip = (i / N_SLICE1) | 0, slice = i % N_SLICE1;
        if (CoordCube.getPruning(Slice_Flip_Prun, i) == depth) {
          for (var j = 0; j < 18; j++) {
            var newSlice = (FRtoBR_Move[slice * 24][j] / 24) | 0;
            var newFlip = flipMove[flip][j];
            if (CoordCube.getPruning(Slice_Flip_Prun, N_SLICE1 * newFlip + newSlice) == 0x0f) {
              CoordCube.setPruning(Slice_Flip_Prun, N_SLICE1 * newFlip + newSlice, (depth + 1));
              done++;
            }
          }
        }
      }
      depth++;
    }
    return Slice_Flip_Prun;
  }
  function generateTable(table, data) {
      switch(table) {
          case "twistMove":
              postMessage({type: "", table: ""});
          break;
      }
      generatedTables.push(table);
  }
  var generatedTables = [];
  function generateTables() {
    getTimer();
    CoordCube.twistMove = generateTwistMove();
    sendProgressMessage("twistMove");
    CoordCube.flipMove = generateFlipMove();
    sendProgressMessage("flipMove");
    CoordCube.FRtoBR_Move = generateFRtoBR_Move();
    sendProgressMessage("FRtoBR_Move");
    CoordCube.URFtoDLF_Move = generateURFtoDLF_Move();
    sendProgressMessage("URFtoDLF_Move");
    CoordCube.URtoDF_Move = generateURtoDF_Move();
    sendProgressMessage("URtoDF_Move");
    CoordCube.URtoUL_Move = generateURtoUL_Move();
    sendProgressMessage("URtoUL_Move");
    CoordCube.UBtoDF_Move = generateUBtoDF_Move();
    sendProgressMessage("UBtoDF_Move");
    CoordCube.MergeURtoULandUBtoDF = generateMergeURtoULandUBtoDF();
    sendProgressMessage("MergeURtoULandUBtoDF");
    CoordCube.Slice_URFtoDLF_Parity_Prun = generateSlice_URFtoDLF_Parity_Prun(CoordCube.FRtoBR_Move, CoordCube.URFtoDLF_Move);
    sendProgressMessage("Slice_URFtoDLF_Parity_Prun");
    CoordCube.Slice_URtoDF_Parity_Prun = generateSlice_URtoDF_Parity_Prun(CoordCube.FRtoBR_Move, CoordCube.URtoDF_Move);
    sendProgressMessage("Slice_URtoDF_Parity_Prun");
    CoordCube.Slice_Twist_Prun = generateSlice_Twist_Prun(CoordCube.FRtoBR_Move, CoordCube.twistMove);
    sendProgressMessage("Slice_Twist_Prun");
    CoordCube.Slice_Flip_Prun = generateSlice_Flip_Prun(CoordCube.FRtoBR_Move, CoordCube.flipMove);
    sendProgressMessage("Slice_Flip_Prun");
  }
  var Search = {
    ax : new Int32Array(31),
    po : new Int32Array(31),

    flip : new Int32Array(31),
    twist : new Int32Array(31),
    slice : new Int32Array(31),

    parity : new Int32Array(31),
    URFtoDLF : new Int32Array(31),
    FRtoBR : new Int32Array(31),
    URtoUL : new Int32Array(31),
    UBtoDF : new Int32Array(31),
    URtoDF : new Int32Array(31),

    minDistPhase1 : new Int32Array(31),
    minDistPhase2 : new Int32Array(31),

    solutionToString : function(length,depthPhase1) {
      var s = "";
      for (var i = 0; i < length; i++) {
        switch (this.ax[i]) {
        case 0:
          s += "U";
          break;
        case 1:
          s += "R";
          break;
        case 2:
          s += "F";
          break;
        case 3:
          s += "D";
          break;
        case 4:
          s += "L";
          break;
        case 5:
          s += "B";
          break;
        }
        switch (this.po[i]) {
        case 1:
          s += " ";
          break;
        case 2:
          s += "2 ";
          break;
        case 3:
          s += "' ";
          break;
        }
        if (i == depthPhase1 - 1) {
         s += ". ";
        }
      }
      return s;
    },
    solution: function(facelets,maxDepth,timeOut,useSeparator) {
      var s;

      // +++++++++++++++++++++check for wrong input +++++++++++++++++++++++++++++
      var count = new Int32Array(6);
      try {
        for (var i = 0; i < 54; i++)
          count[Color.valueOf(facelets.charAt(i)).ordinal()]++;
      } catch (e) {
        return "Error 1";
      }
      for (var i = 0; i < 6; i++)
        if (count[i] != 9)
          return "Error 1";

      var fc = new FaceCube(facelets);
      var cc = fc.toCubieCube();
      if ((s = cc.verify()) != 0)
        return "Error " + Math.abs(s);

      // +++++++++++++++++++++++ initialization +++++++++++++++++++++++++++++++++
      var c = new CoordCube(cc);

      this.po[0] = 0;
      this.ax[0] = 0;
      this.flip[0] = c.flip;
      this.twist[0] = c.twist;
      this.parity[0] = c.parity;
      this.slice[0] = (c.FRtoBR / 24) | 0;
      this.URFtoDLF[0] = c.URFtoDLF;
      this.FRtoBR[0] = c.FRtoBR;
      this.URtoUL[0] = c.URtoUL;
      this.UBtoDF[0] = c.UBtoDF;

      this.minDistPhase1[1] = 1;// else failure for depth=1, n=0
      var mv = 0, n = 0;
      var busy = false;
      var depthPhase1 = 1;

      var tStart = (new Date()).getTime();

      // +++++++++++++++++++ Main loop ++++++++++++++++++++++++++++++++++++++++++
      do {
        do {
          if ((depthPhase1 - n > this.minDistPhase1[n + 1]) && !busy) {
            if (this.ax[n] == 0 || this.ax[n] == 3)// Initialize next move
              this.ax[++n] = 1;
            else
              this.ax[++n] = 0;
            this.po[n] = 1;
          } else if (++this.po[n] > 3) {
            do {// increment axis
              if (++this.ax[n] > 5) {

                if ((new Date()).getTime() - tStart > timeOut << 10)
                  return "Error 8";

                if (n == 0) {
                  if (depthPhase1 >= maxDepth)
                    return "Error 7";
                  else {
                    depthPhase1++;
                    this.ax[n] = 0;
                    this.po[n] = 1;
                    busy = false;
                    break;
                  }
                } else {
                  n--;
                  busy = true;
                  break;
                }
              } else {
                this.po[n] = 1;
                busy = false;
              }
            } while (n != 0 && (this.ax[n - 1] == this.ax[n] || this.ax[n - 1] - 3 == this.ax[n]));
          } else
            busy = false;
        } while (busy);

        // +++++++++++++ compute new coordinates and new minDistPhase1 ++++++++++
        // if minDistPhase1 =0, the H subgroup is reached
        mv = 3 * this.ax[n] + this.po[n] - 1;
        this.flip[n + 1] = CoordCube.flipMove[this.flip[n]][mv];
        this.twist[n + 1] = CoordCube.twistMove[this.twist[n]][mv];
        this.slice[n + 1] = (CoordCube.FRtoBR_Move[this.slice[n] * 24][mv] / 24) | 0;
        this.minDistPhase1[n + 1] = Math.max(CoordCube.getPruning(CoordCube.Slice_Flip_Prun, CoordCube.N_SLICE1 * this.flip[n + 1]
            + this.slice[n + 1]), CoordCube.getPruning(CoordCube.Slice_Twist_Prun, CoordCube.N_SLICE1 * this.twist[n + 1]
            + this.slice[n + 1]));
        // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        if (this.minDistPhase1[n + 1] == 0 && n >= depthPhase1 - 5) {
          this.minDistPhase1[n + 1] = 10;// instead of 10 any value >5 is possible
          if (n == depthPhase1 - 1 && (s = this.totalDepth(depthPhase1, maxDepth)) >= 0) {
            if (s == depthPhase1
                || (this.ax[depthPhase1 - 1] != this.ax[depthPhase1] && this.ax[depthPhase1 - 1] != this.ax[depthPhase1] + 3))
              return useSeparator ? this.solutionToString(s, depthPhase1) : this.solutionToString(s);
          }

        }
      } while (true);
    },
    totalDepth: function(depthPhase1, maxDepth) {
      var mv = 0, d1 = 0, d2 = 0;
      var maxDepthPhase2 = Math.min(10, maxDepth - depthPhase1);// Allow only max 10 moves in phase2
      for (var i = 0; i < depthPhase1; i++) {
        mv = 3 * this.ax[i] + this.po[i] - 1;
        this.URFtoDLF[i + 1] = CoordCube.URFtoDLF_Move[this.URFtoDLF[i]][mv];
        this.FRtoBR[i + 1] = CoordCube.FRtoBR_Move[this.FRtoBR[i]][mv];
        this.parity[i + 1] = CoordCube.parityMove[this.parity[i]][mv];
      }

      if ((d1 = CoordCube.getPruning(CoordCube.Slice_URFtoDLF_Parity_Prun,
          (CoordCube.N_SLICE2 * this.URFtoDLF[depthPhase1] + this.FRtoBR[depthPhase1]) * 2 + this.parity[depthPhase1])) > maxDepthPhase2)
        return -1;

      for (var i = 0; i < depthPhase1; i++) {
        mv = 3 * this.ax[i] + this.po[i] - 1;
        this.URtoUL[i + 1] = CoordCube.URtoUL_Move[this.URtoUL[i]][mv];
        this.UBtoDF[i + 1] = CoordCube.UBtoDF_Move[this.UBtoDF[i]][mv];
      }

      this.URtoDF[depthPhase1] = CoordCube.MergeURtoULandUBtoDF[this.URtoUL[depthPhase1]][this.UBtoDF[depthPhase1]];

      if ((d2 = CoordCube.getPruning(CoordCube.Slice_URtoDF_Parity_Prun,
          (CoordCube.N_SLICE2 * this.URtoDF[depthPhase1] + this.FRtoBR[depthPhase1]) * 2 + this.parity[depthPhase1])) > maxDepthPhase2)
        return -1;

      if ((this.minDistPhase2[depthPhase1] = Math.max(d1, d2)) == 0)// already solved
        return depthPhase1;

      // now set up search

      var depthPhase2 = 1;
      var n = depthPhase1;
      var busy = false;
      this.po[depthPhase1] = 0;
      this.ax[depthPhase1] = 0;
      this.minDistPhase2[n + 1] = 1;// else failure for depthPhase2=1, n=0
      // +++++++++++++++++++ end initialization +++++++++++++++++++++++++++++++++
      do {
        do {
          if ((depthPhase1 + depthPhase2 - n > this.minDistPhase2[n + 1]) && !busy) {

            if (this.ax[n] == 0 || this.ax[n] == 3)// Initialize next move
            {
              this.ax[++n] = 1;
              this.po[n] = 2;
            } else {
              this.ax[++n] = 0;
              this.po[n] = 1;
            }
          } else if ((this.ax[n] == 0 || this.ax[n] == 3) ? (++this.po[n] > 3) : ((this.po[n] = this.po[n] + 2) > 3)) {
            do {// increment axis
              if (++this.ax[n] > 5) {
                if (n == depthPhase1) {
                  if (depthPhase2 >= maxDepthPhase2)
                    return -1;
                  else {
                    depthPhase2++;
                    this.ax[n] = 0;
                    this.po[n] = 1;
                    busy = false;
                    break;
                  }
                } else {
                  n--;
                  busy = true;
                  break;
                }

              } else {
                if (this.ax[n] == 0 || this.ax[n] == 3)
                  this.po[n] = 1;
                else
                  this.po[n] = 2;
                busy = false;
              }
            } while (n != depthPhase1 && (this.ax[n - 1] == this.ax[n] || this.ax[n - 1] - 3 == this.ax[n]));
          } else
            busy = false;
        } while (busy);
        // +++++++++++++ compute new coordinates and new minDist ++++++++++
        mv = 3 * this.ax[n] + this.po[n] - 1;

        this.URFtoDLF[n + 1] = CoordCube.URFtoDLF_Move[this.URFtoDLF[n]][mv];
        this.FRtoBR[n + 1] = CoordCube.FRtoBR_Move[this.FRtoBR[n]][mv];
        this.parity[n + 1] = CoordCube.parityMove[this.parity[n]][mv];
        this.URtoDF[n + 1] = CoordCube.URtoDF_Move[this.URtoDF[n]][mv];

        this.minDistPhase2[n + 1] = Math.max(CoordCube.getPruning(CoordCube.Slice_URtoDF_Parity_Prun, (CoordCube.N_SLICE2
            * this.URtoDF[n + 1] + this.FRtoBR[n + 1])
            * 2 + this.parity[n + 1]), CoordCube.getPruning(CoordCube.Slice_URFtoDLF_Parity_Prun, (CoordCube.N_SLICE2
            * this.URFtoDLF[n + 1] + this.FRtoBR[n + 1])
            * 2 + this.parity[n + 1]));
        // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

      } while (this.minDistPhase2[n + 1] != 0);
      return depthPhase1 + depthPhase2;
    }
  };
})();
