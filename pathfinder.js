var svgDocument;

var PathFinder = (function() {
    var svgns  = "http://www.w3.org/2000/svg";
    var offset = 5;


    return function(from, to) {
        var barriers = [];
        var stop = 20;

        return {
            addBarrier: function(barrier) {
                barriers.push(barrier);
            },

            getEdgePoints: function() {
                var destenationPoints = [to];
                var stablePoints = [from];

                var nextPoint, currentPoint, newLine, intersection;

                while (--stop && destenationPoints.length) {
                    nextPoint = destenationPoints.pop();
                    currentPoint = stablePoints[stablePoints.length - 1];

                    drawPoint(currentPoint);

                    newLine = buildStep(currentPoint, nextPoint);
                    intersection = getClosestIntersection(newLine, barriers);

                    if (intersection !== undefined) {
                        console.log("Resolving intersection");
                        stablePoints.push(getClosestStablePoint(currentPoint, intersection));
                        destenationPoints.push(nextPoint, getNextPoint(currentPoint, nextPoint, intersection));
                    } else {
                        stablePoints.push(nextPoint);
                        console.log("No intersections on current step. Moving forward");
                    }
                }

                if (stop == 0) {
                    console.log("Killed");
                } else {
                    console.log("Done");
                }


            }
        };
    };

    function getNextPoint(stablePoint, unstablePoint, intersection) {
        var distances = getBypassDistances(stablePoint, unstablePoint, intersection);
//        var leftMax = distances[distances.length - 1];
//        var rightMax = distances[0];
//
//        if ()
//
//        console.log(distances);

        return new Point2D(100,20);

//        (-20+40)/(20-40)

//        shapeEdges.sort(function(point) {
//            function distance(a, b) {
//                return Math.sqrt(Math.pow((b.x - a.x), 2) + Math.pow((b.y - a.y), 2));
//            }
//
//            return function(a, b) {
//                return distance(point, a) - distance(point, b);
//            };
//        }(intersection.point));
//
//        for (var i = 1; i < shapeEdges.length; ++i) {
//            if ()
//        }
//
    }

    function getBypassDistances(from, to, intersection) {
        var shapeEdges = intersection.shape.getIntersectionParams().params[0];
        var distances = [];
        var edges = {};

        for (var i = 0, distance; i < shapeEdges.length; ++i) {

            distance = getDistanceFromPointToLine(from, to, shapeEdges[i]);
            distances.push(distance);
            edges["" + distance] = shapeEdges[i];
        }

        distances.sort(function(a, b) {return a - b;});

        return {
            sortedDistances: distances,
            edges: edges
        };
    }

    function getDistanceFromPointToLine(p0, p1, p) {
        return ((p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y + (p0.x * p1.y - p1.x * p0.y)) / Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
    }

    function getClosestStablePoint(from, intersection) {
        var to = intersection.point;
        var x1, y1;

        var k = (to.y - from.y) / (to.x - from.x);
        var b = to.y - k * to.x;
        var dx = Math.sqrt(Math.pow(offset, 2) / (1 + Math.pow(k, 2)));

        x1 = to.x - dx;
        y1 = k * x1 + b;

        return new Point2D(x1, y1);
    }

    function getClosestIntersection(path, barriers) {
        var intersections = [];
        var intersectionPoints = [];

        for (var i = 0; i < barriers.length; ++i) {
            intersectionPoints = Intersection.intersectShapes(path, barriers[i]).points;

            for (var j = 0; j < intersectionPoints.length; ++j) {
                intersections.push({
                    point: intersectionPoints[j],
                    shape: barriers[i]
                });
            }
        }

        return intersections[0];
    }

    function buildStep(from, to) {
        return new Line(drawLine(from, to));
    }


    function drawLine(from, to) {
        var line = svgDocument.createElementNS(svgns, "line");

        line.setAttributeNS(null, "x1", from.x);
        line.setAttributeNS(null, "y1", from.y);

        line.setAttributeNS(null, "x2", to.x);
        line.setAttributeNS(null, "y2", to.y);

        line.setAttributeNS(null, "stroke", "orange");
        line.setAttributeNS(null, "stroke-width", 1);
        line.setAttributeNS(null, "opacity", 0.5);

        svgDocument.documentElement.appendChild(line);
        return line;
    }

    function drawPoint(coord) {
        var point = svgDocument.createElementNS(svgns, "use");

        point.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "href",
            "#point"
        );

        point.setAttributeNS(null, "x", coord.x);
        point.setAttributeNS(null, "y", coord.y);
        point.setAttributeNS(null, "display", "inline");

        svgDocument.documentElement.appendChild(point);
        return point;
    }

})();

var points = new Array();
var shapes = new Array();
var mouser;

/*****
*
*   init
*
*****/
function init(e) {
    if (window.svgDocument == null) {
        svgDocument = e.target.ownerDocument;
    }

    var background = svgDocument.getElementById("background");
    var infoElem = svgDocument.getElementById("info");

    var info = infoElem.firstChild;
    var from = new Circle(svgDocument.getElementById("a"));
    var to = new Circle(svgDocument.getElementById("b"));

    var azap   = new AntiZoomAndPan();
    mouser = new Mouser();

    azap.appendNode(infoElem);
    azap.appendNode(mouser.svgNode);
    azap.appendNode(background);

    var pathFinder = PathFinder(from.center.point, to.center.point);

    loadShapes(svgDocument, pathFinder);
    pathFinder.getEdgePoints();

    info.data = "Done";
}


/*****
*
*   loadShapes
*
*****/
function loadShapes(svgDocument, pathFinder) {
    var children = svgDocument.documentElement.childNodes;

    for ( var i = 0; i < children.length; i++ ) {
        var child = children.item(i);

        if ( child.nodeType == 1 ) {
            // found element node
            var edit  = child.getAttributeNS(
                "http://www.kevlindev.com/gui",
                "edit"
            );

            if ( edit != null && edit != "" ) {
                // ignore value for now
                var shape;

                switch ( child.localName ) {
                    case "circle":shape = new Circle(child);break;
                    case "ellipse":shape = new Ellipse(child);break;
                    case "line":shape = new Line(child);break;
                    case "path":shape = new Path(child);break;
                    case "polygon":shape = new Polygon(child);break;
                    case "rect":shape = new Rectangle(child);break;
                    default:
                        // do nothing for now
                }

                if ( shape != null ) {
                    shape.realize();
                    shape.callback = pathFinder.getEdgePoints;
                    pathFinder.addBarrier(shape);
                }
            }
        }
    }
}
