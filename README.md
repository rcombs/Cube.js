Cube.js is a Rubik's Cube solver and utility library, implementing Kociemba's Two-Phase algorithm in JS. It can solve any given cube in 20 moves or less.

# Syntax
Different syntaxes are used for passing cube data around the library, and for getting result data out. Explanations of them are listed here.

## Face abbreviations
An individual face of a cube is represented as a single character, usually in a larger string. Color schemes differ from cube to cube, so rather than abbreviating color names, we abbreviate the side of the cube relative to the solver. In the standard order they are usually used in, the characters are:
"U": Top (Up), usually yellow
"R": Right, usually green
"F": Front, usually red
"D": Bottom (Down), usually white
"L": Left, usually blue
"B": Back, usually orange

## Facelets
For the same reasons listed above, facelets are not abbreviated by color names. The character used for a facelet is the same as that which is used for the face whose center facelet matches its color. In addition, when representing an unfinished cube, blank facelets which have not yet been filled in are represented by an underscore ("_").

## Facelet-Cube
In general, when passing complete or unfinished cubes in and out of the library, the Facelet-Cube syntax is used. A Facelet-Cube is a cube as represented by the configuration of its facelets. In this library, there are two ways of representing facelet-cubes.

### String Facelet-Cube
The first (and more common) way to represent a facelet-cube as a 54-character string, with each character representing a facelet. The string is broken up into 6 9-character groups, each of which represents a face's facelets in row-major order (left-to-right, then top-to-bottom). The face groups are in the order listed under face abbreviations.

### Array Facelet-Cube
The second way to represent a facelet-cube, which is used more with internal functions, is as a three-dimensional array. The first dimension represents faces (in the standard order). The second represents rows of facelets, and the third represents columns. Each element in the third dimension of the array is a one-character string representing an individual facelet as listed above.

## Movesets (Solutions/Generators)
Sets of moves to be made on a cube can be represented in two ways.

### String Movesets
TBD

### Array Movesets
TBD

# Including
Place Cube.js and CubeWorker.js in the same directory. Include with `<script src="Cube.js"></script>`

# Usage
All methods are called as `Cube.<methodName>`. Worker methods are asynchronous, and do not block the UI thread, but they each block the Worker until they're finished. They all return undefined, and a callback function must be provided to receive their output

## Asynchronous (Worker) functions
### `generateTables`
This function must be called before the solve function is used. It prepares a set of tables that are required for the solver to work. It runs fastest in WebKit/Safari's Nitro JS engine, at around 20 seconds on a fast machine.

### `solveCube`
`solveCube` is the actual solver method. It takes up to 7 arguments:

1. `cube`: The cube to be solved, represented as a facelet-cube string.
2. `callback`: The function to be called if the solver finds a solution successfully. It takes one argument: a moveset defining the solution.
3. `errorHandler`: The function to be called if either the cube provided is invalid, no solution exists within the maximum number of moves provided, or the solver takes longer than the given time limit.
4. `resultAsArray`: Boolean; if true, send the result to the callback as an array. Otherwise, provide a string. Defaults to false.
5. `maxDepth`: Maximum number of moves to solve to. Defaults to 20; some cubes cannot be solved in fewer than 20 moves.
6. `maxTime`: Timeout value in seconds for the solver. If the solver takes longer than this number of seconds, it will cancel itself and fire the error handler. Defaults to 10 seconds.
7. `useSeparator`: If true, add a period between the first and second phase of the solution. Has no effect when `resultAsArray` is true. Defaults to false.

#### Errors
Possible errors sent to the error handler are:

1. Not exactly nine facelets of each color.
2. Not all 12 edges exist exactly once.
3. Flip error: One edge has to be flipped.
4. Not all corners exist exactly once.
5. Twist error: one corner has to be twisted.
6. Parity error: two corners or edges have to be exchanged.
7. No solution found within number of moves specified.
8. Solver timed out, took longer than given time.

### `verifyCube`
Verifies that a cube is valid and solvable. An unsolvable cube could be an incorrectly entered cube, or one which has been disassembled and reassembled incorrectly. Takes two arguments: a cube expressed as a face-cube string, and a callback, which takes the error value as an argument. If the error is 0, the cube is valid. Otherwise, the error is one of errors 1 through 5 listed above.

### `randomCube`
Generates a random, valid cube. Takes a single callback as an argument. The callback takes a face-cube string as its only argument.

## Synchronous (Main thread) functions
### `autocompleteCube`
The `autocompleteCube` method searches a given unfinished cube for points where it can fill in blank facelets with colors automatically. It takes one argument: a string facelet-cube.

### `reverseMoveset`
`reverseMoveset` takes a given string moveset and returns it in reverse. This is useful to give a "generator" for a cube whose solution is known, so a solved cube can be moved to a particular state.

### `validateMoveset`
`validateString` takes a string and checks if it's a valid moveset, using a simple regex. Returns true if valid, false if not.

## Utility/Conversion functions (Synchronous)
TBD
