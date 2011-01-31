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

                var nextPoint, nextStablePoint, currentPoint, newLine, intersection;

                while (--stop && destenationPoints.length) {
                    nextPoint = destenationPoints.pop();
                    currentPoint = stablePoints[stablePoints.length - 1];

                    drawPoint(currentPoint);

                    newLine = buildStep(currentPoint, nextPoint);
                    intersection = getClosestIntersection(newLine, barriers);

                    if (intersection !== undefined) {
                        console.log("Resolving intersection");
                        nextStablePoint = getClosestStablePoint(currentPoint, intersection);
                        stablePoints.push(nextStablePoint);
                        destenationPoints.push(nextPoint, getNextPoint(nextStablePoint, nextPoint, intersection));
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
        var shapeEdges = intersection.shape.getIntersectionParams().params[0];
        var from, to;

        for (var i = 1; i < shapeEdges.length; ++i) {
            if (areCollinear(intersection.point, shapeEdges[i-1], shapeEdges[i])) {
                console.log(intersection.point + ", " + shapeEdges[i-1] + ", " + shapeEdges[i] + " are collinear");
                from = intersection.point;
                to = shapeEdges[i];

                break;
            }
        }

        var dx = to.x - from.x;
        var dy = to.y - from.y;

        return moveAlongLine(stablePoint, new Point2D(stablePoint.x + dx, stablePoint.y + dy), 1);

    }

    function areCollinear(p1, p2, p3) {
        var coef = getLineCoefficients(p2, p1);
        return Math.abs(coef.k * p3.x + coef.b - p3.y) < 0.01;
    }

    function getClosestStablePoint(from, intersection) {
        var to = intersection.point;
        return moveAlongLine(from, to, -1);
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

    function moveAlongLine(from, to, direction) {
        var coef = getLineCoefficients(from, to);
        var x, y;

        var dx = Math.sqrt(Math.pow(offset, 2) / (1 + Math.pow(coef.k, 2)));

        x = to.x + dx * direction;
        y = coef.k * x + coef.b;

        return new Point2D(x, y);
    }

    function getLineCoefficients(from, to) {
        var k = (to.y - from.y) / (to.x - from.x);

        return {
            k: k,
            b: to.y - k * to.x
        };
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
