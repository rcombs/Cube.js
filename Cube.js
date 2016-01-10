"use strict";
(typeof Cube == "object") || (function() {
  window.Cube = {
    worker: new Worker("CubeWorker.js"),
    tablesGenerated: false,
    movesetToArray: function(solution) {
      var moves = solution.split(" ");
      var arr = [];
      for (var i = 0; i < moves.length; i++) {
        arr.push(new Cube.move(moves[i]));
      }
      return arr;
    },
    move: function Move(str) {
      this.face = str.substring(0, 1) || "U";
      var move = str.substring(1, 2);
      if (move == "") {
        this.move = 1;
        this.direction = 1;
      } else if (move == "'") {
        this.move = 1;
        this.direction = -1;
      } else if (move == "2") {
        this.move = 2;
        this.direction = 0;
      } else {
        this.move = 1;
        this.direction = 1;
      }
    },
    colors: ["U","R","F","D","L","B"],
    facelets: ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"],
    corners: ["URF","UFL","ULB","URB","RFD","FDL","DLB","RDB"],
    edges: ["UR","UF","UL","UB","RD","FD","DL","DB","RF","FL","LB","RB"],
    colorIndexes: {
      U: 0,
      R: 1,
      F: 2,
      D: 3,
      L: 4,
      B: 5
    },
    cubeToArr: function(cube) {
      var cubeArr = [];
      for (var i = 0; i < 6; i++) {
        cubeArr[i] = [];
        for (var j = 0; j < 3; j++) {
          cubeArr[i][j] = [];
          for (var k = 0; k < 3; k++) {
            cubeArr[i][j][k] = cube.charAt(i*9+j*3+k);
          }
        }
      }
      return cubeArr;
    },
    arrToCube: function(arr) {
      var str = "";
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 3; j++) {
          for (var k = 0; k < 3; k++) {
            str += arr[i][j][k];
          }
        }
      }
      return str;
    },
    getAdjacentFacelets: function(face, row, col) {
      var cube = Cube.faceletToCubelet[face][row][col];
      var result = [];
      for (var x = 0; x < 6; x++) {
        for (var y = 0; y < 3; y++) {
          for (var z = 0; z < 3; z++) {
            if (
              !(x == face && y == row && z == col) &&
              Cube.faceletToCubelet[x][y][z] == cube
            ) {
              result.push([x, y, z]);
            }
          }
        }
      }
      return result;
    },
    faceletToCubelet: [
      [[0, 1, 2], [3, 4, 5], [6, 7, 8]],
      [[8, 5, 2], [17, 14, 11], [26, 23, 20]],
      [[6, 7, 8], [15, 16, 17], [24, 25, 26]],
      [[24, 25, 26], [21, 22, 23], [18, 19, 20]],
      [[0, 3, 6], [9, 12, 15], [18, 21, 24]],
      [[2, 1, 0], [11, 10, 9], [20, 19, 18]]
    ],
    orderColors: function() {
      return Array.prototype.slice.call(arguments).sort(function(a, b) {
        if (Cube.colorIndexes[a] < Cube.colorIndexes[b]) {
          return -1;
        } else if (Cube.colorIndexes[a] > Cube.colorIndexes[b]) {
          return 1;
        }
        return 0;
      }).join("");
    },
    autocompleteCube: function(cube) {
      return Cube.arrToCube(Cube.autocompleteArray(Cube.cubeToArr(cube)));
    },
    autocompleteArray: function(arrIn) {
      var current = arrIn.slice()
      var oldCube;
      do {
        oldCube = current.slice();
        current = Cube.autocompleteEdge(current);
      } while (Cube.arrToCube(current) != Cube.arrToCube(oldCube));
      do {
        oldCube = current.slice();
        current = Cube.autocompleteCorner(current);
      } while (Cube.arrToCube(current) != Cube.arrToCube(oldCube));
      return current;
    },
    autocompleteEdge: function(arrIn) {
      var arr = arrIn.slice();
      var completedEdges = [];
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 3; j++) {
          for (var k = (1 - j % 2); k < 3; k+=2) {
            var thisFacelet = arr[i][j][k];
            if (thisFacelet == "_") {
              continue;
            }
            var ofc = Cube.getAdjacentFacelets(i, j, k)[0];
            var opposingFacelet = arr[ofc[0]][ofc[1]][ofc[2]];
            if (opposingFacelet == "_") {
              continue;
            }
            var edge = Cube.orderColors(thisFacelet, opposingFacelet);
            if (completedEdges.indexOf(edge) == -1) {
              completedEdges.push(edge);
            }
          }
        }
      }
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 3; j++) {
          for (var k = (1 - j % 2); k < 3; k+=2) {
            var thisFacelet = arr[i][j][k];
            if (thisFacelet != "_") {
              continue;
            }
            var ofc = Cube.getAdjacentFacelets(i, j, k)[0];
            var opposingFacelet = arr[ofc[0]][ofc[1]][ofc[2]];
            var edge = Cube.orderColors(thisFacelet, opposingFacelet);
            if (opposingFacelet == "_") {
              continue;
            }
            var possibleColors = [];
            for (var l = 0; l < Cube.colors.length; l++) {
              var color = Cube.colors[l];
              var edge = Cube.orderColors(opposingFacelet, color);
              if (Cube.edges.indexOf(edge) != -1) {
                if (completedEdges.indexOf(edge) == -1) {
                  possibleColors.push(color);
                }
              }
            }
            if (possibleColors.length == 1) {
              arr[i][j][k] = possibleColors[0];
            }
          }
        }
      }
      return arr;
    },
    autocompleteCorner: function(arrIn) {
      var arr = arrIn.slice();
      var completedCorners = [];
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 3; j+=2) {
          for (var k = 0; k < 3; k+=2) {
            var thisFacelet = arr[i][j][k];
            if (thisFacelet == "_") {
              continue;
            }
            var ofc = Cube.getAdjacentFacelets(i, j, k);
            var opposingFacelet1 = arr[ofc[0][0]][ofc[0][1]][ofc[0][2]];
            var opposingFacelet2 = arr[ofc[1][0]][ofc[1][1]][ofc[1][2]];
            if (opposingFacelet1 == "_" || opposingFacelet2 == "_") {
              continue;
            }
            var corner = Cube.orderColors(thisFacelet, opposingFacelet1, opposingFacelet2);
            if (completedCorners.indexOf(corner) == -1) {
              completedCorners.push(corner);
            }
          }
        }
      }
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 3; j+=2) {
          for (var k = 0; k < 3; k+=2) {
            var thisFacelet = arr[i][j][k];
            if (thisFacelet != "_") {
              continue;
            }
            var ofc = Cube.getAdjacentFacelets(i, j, k);
            var opposingFacelet1 = arr[ofc[0][0]][ofc[0][1]][ofc[0][2]];
            var opposingFacelet2 = arr[ofc[1][0]][ofc[1][1]][ofc[1][2]];
            var corner = Cube.orderColors(thisFacelet, opposingFacelet1, opposingFacelet2);
            if (opposingFacelet1 == "_" || opposingFacelet2 == "_") {
              continue;
            }
            var possibleColors = [];
            for (var l = 0; l < Cube.colors.length; l++) {
              var color = Cube.colors[l];
              var corner = Cube.orderColors(opposingFacelet1, opposingFacelet2, color);
              if (Cube.corners.indexOf(corner) != -1) {
                if (completedCorners.indexOf(corner) == -1) {
                  possibleColors.push(color);
                }
              }
            }
            if (possibleColors.length == 1) {
              arr[i][j][k] = possibleColors[0];
            }
          }
        }
      }
      return arr;
    },
    reverseArray: function(arr) {
      var rarr = Cube.movesetToArray(Cube.arrayToMoveset(arr)).reverse();
      for (var i = 0; i < rarr.length; i++) {
        rarr[i].direction = rarr[i].direction * -1;
      }
      return rarr;
    },
    arrayToMoveset: function(arr, underscore) {
      var str = "";
      for (var i = 0; i < arr.length; i++) {
        var move = arr[i];
        str += move.text;
        if (i != arr.length - 1) {
          str += underscore ? "_" : " ";
        }
      }
      return str;
    },
    validateMoveset: function(str) {
      return !!str.match(/^([ULFRBD](['2]|))( ([ULFRBD](['2]|)))*$/);
    },
    reverseMoveset: function(str) {
      return Cube.arrayToMoveset(Cube.reverseArray(Cube.movesetToArray(str)));
    },
    randomCube: function(callback) {
      var eventListener = function(event) {
        if (event.data.type == "random") {
          callback(event.data.result);
          Cube.worker.removeEventListener("message", eventListener, false);
        }
      };
      Cube.worker.addEventListener("message", eventListener, false);
      Cube.worker.postMessage({type: "random"});
    },
    verifyCube: function(cube, callback) {
      var eventListener = function(event) {
        if (event.data.type == "verify" && event.data.cube == cube) {
          callback(Math.abs(event.data.result));
          Cube.worker.removeEventListener("message", eventListener, false);
        }
      };
      Cube.worker.addEventListener("message", eventListener, false);
      Cube.worker.postMessage({type: "verify", cube: cube});
    },
    solveCube: function(cube, callback, errorHandler, resultAsArray, maxDepth, maxTime, useSeparator) {
      if (!Cube.tablesGenerated) {
        throw new Error("Cubes cannot be solved without generating tables first!");
      }
      var eventListener = function(event) {
        if (event.data.type == "solution" && event.data.cube == cube) {
          if (event.data.result.indexOf("Error") == 0 && errorCallback) {
            errorCallback(parseInt(event.data.result.substring(6, 7)));
          } else {
            var result = event.data.result.substring(0, event.data.result.length - 1);
            if (resultAsArray) {
              callback(Cube.movesetToArray(result));
            } else {
              callback(result);
            }
          }
          Cube.worker.removeEventListener("message", eventListener, false);
        }
      };
      Cube.worker.addEventListener("message", eventListener, false);
      var obj = {
        cube: cube,
        maxDepth: maxDepth || 20,
        maxTime: maxTime || 10,
        useSeparator: !!useSeparator,
        type: "solve"
      };
      Cube.worker.postMessage(obj);
    },
    generateTables: function(finishCallback, progressCallback) {
      var eventListener = function(event) {
        if (event.data.type == "progress" && progressCallback) {
          progressCallback(event.data.line, event.data.time);
        } else if (event.data.type == "CoordCube") {
          finishCallback();
          Cube.tablesGenerated = true;
          Cube.worker.removeEventListener("message", eventListener, false);
        }
      }
      Cube.worker.addEventListener("message", eventListener, false);
      Cube.worker.postMessage({type: "generateTables"});
    }
  };
  Object.defineProperty(Cube.move.prototype, "text", {
    get: function() {
      var str = this.face;
      if (this.direction == -1) {
        str += "'";
      } else if (this.move == 2) {
        str += "2";
      }
      return str;
    },
    set: function(str) {
      var face = str.substring(0, 1);
      var move = str.substring(1, 2);
      var direction = 0;
      if (move == "") {
        move = 1;
        direction = 1;
      } else if (move == "'") {
        move = 1;
        direction = -1;
      } else if (move == "2") {
        move = 2;
        direction = 0;
      }
      this.face = face;
      this.move = move;
      this.direction = direction;
    }
  });
  Object.defineProperty(Cube.move.prototype, "toString", {
    value: function toString() {
      return this.text;
    }
  });
})();
