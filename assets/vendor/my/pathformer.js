#!/usr/bin/env node

/**
 * Pathformer
 * Beta version
 *
 * Take any SVG version 1.1 and transform
 * child elements to 'path' elements
 *
 * This code is purely forked from
 * https://github.com/Waest/SVGPathConverter
 */

/**
 * Class constructor
 *
 * @param {DOM} element Dom element of the SVG
 */
function Pathformer(element) {
  this.scan(element);
}

/**
 * List of tags which can be transformed
 * to path elements
 *
 * @type {Array}
 */
Pathformer.prototype.TYPES = ['line', 'ellipse', 'circle', 'polygon', 'polyline', 'rect'];

/**
 * List of attribute names which contain
 * data. This array list them to check if
 * they contain bad values, like percentage.
 *
 * @type {Array}
 */
Pathformer.prototype.ATTR_WATCH = ['cx', 'cy', 'points', 'r', 'rx', 'ry', 'x', 'x1', 'x2', 'y', 'y1', 'y2'];

/**
 * Finds the elements compatible for transform
 * and apply the liked method
 *
 * @param  {object} options Object from the constructor
 */
Pathformer.prototype.scan = function (svg) {
  var fn, element, pathData, pathDom,
    elements;

  // QuerySelectorAll doesn't seem to behave nicely with JSDom, maybe?
  // Iterating over the types probably works okay, anyway.
  this.TYPES.forEach(function(type) {
    elements = document.querySelectorAll(type);
    for (var i = 0; i < elements.length; i++) {
      element = elements[i];
      fn = this[element.tagName.toLowerCase() + 'ToPath'];
      pathData = fn(this.parseAttr(element.attributes));
      pathDom = this.pathMaker(element, pathData);
      element.parentNode.replaceChild(pathDom, element);
    }
  }.bind(this));

  console.log(document.querySelector("svg").outerHTML);
};


/**
 * Read `line` element to extract and transform
 * data, to make it ready for a `path` object.
 *
 * @param  {DOMelement} element Line element to transform
 * @return {object}             Data for a `path` element
 */
Pathformer.prototype.lineToPath = function (element) {
  var newElement = {};
  newElement.d = 'M' + element.x1 + ',' + element.y1 + 'L' + element.x2 + ',' + element.y2;
  return newElement;
};

/**
 * Read `rect` element to extract and transform
 * data, to make it ready for a `path` object.
 * The radius-border is not taken in charge yet.
 * (your help is more than welcomed)
 *
 * @param  {DOMelement} element Rect element to transform
 * @return {object}             Data for a `path` element
 */
Pathformer.prototype.rectToPath = function (element) {
  var newElement = {},
    x = parseFloat(element.x) || 0,
    y = parseFloat(element.y) || 0,
    width = parseFloat(element.width) || 0,
    height = parseFloat(element.height) || 0;
  newElement.d  = 'M' + x + ' ' + y + ' ';
  newElement.d += 'L' + (x + width) + ' ' + y + ' ';
  newElement.d += 'L' + (x + width) + ' ' + (y + height) + ' ';
  newElement.d += 'L' + x + ' ' + (y + height) + ' Z';
  return newElement;
};

/**
 * Read `polyline` element to extract and transform
 * data, to make it ready for a `path` object.
 *
 * @param  {DOMelement} element Polyline element to transform
 * @return {object}             Data for a `path` element
 */
Pathformer.prototype.polylineToPath = function (element) {
  var newElement = {};
  var points = element.points.split(' ');
  var path = 'M' + points[0];
  for(var i = 1; i < points.length; i++) {
    if (points[i].indexOf(',') !== -1) {
      path += 'L'+points[i];
    }
  }
  newElement.d = path;
  return newElement;
};

/**
 * Read `polygon` element to extract and transform
 * data, to make it ready for a `path` object.
 * This method rely on polylineToPath, because the
 * logic is similar. THe path created is just closed,
 * so it needs an 'Z' at the end.
 *
 * @param  {DOMelement} element Polygon element to transform
 * @return {object}             Data for a `path` element
 */
Pathformer.prototype.polygonToPath = function (element) {
  var newElement = Pathformer.prototype.polylineToPath(element);
  newElement.d += 'Z';
  return newElement;
};

/**
 * Read `elipse` element to extract and transform
 * data, to make it ready for a `path` object.
 *
 * @param  {DOMelement} element Elipse element to transform
 * @return {object}             Data for a `path` element
 */
Pathformer.prototype.ellipseToPath = function (element) {
  var startX = element.cx - element.rx,
      startY = element.cy;
  var endX = parseFloat(element.cx) + parseFloat(element.rx),
      endY = element.cy;

  var newElement = {};
  newElement.d = 'M' + startX + ',' + startY +
                 'A' + element.rx + ',' + element.ry + ' 0,1,1 ' + endX + ',' + endY +
                 'A' + element.rx + ',' + element.ry + ' 0,1,1 ' + startX + ',' + endY;
  return newElement;
};

/**
 * Read `circle` element to extract and transform
 * data, to make it ready for a `path` object.
 *
 * @param  {DOMelement} element Circle element to transform
 * @return {object}             Data for a `path` element
 */
Pathformer.prototype.circleToPath = function (element) {
  var newElement = {};
  var startX = element.cx - element.r,
      startY = element.cy;
  var endX = parseFloat(element.cx) + parseFloat(element.r),
      endY = element.cy;
  newElement.d =  'M' + startX + ',' + startY +
                  'A' + element.r + ',' + element.r + ' 0,1,1 ' + endX + ',' + endY +
                  'A' + element.r + ',' + element.r + ' 0,1,1 ' + startX + ',' + endY;
  return newElement;
};

/**
 * Create `path` elements form original element
 * and prepared objects
 *
 * @param  {DOMelement} element  Original element to transform
 * @param  {object} pathData     Path data (from `toPath` methods)
 * @return {DOMelement}          Path element
 */
Pathformer.prototype.pathMaker = function (element, pathData) {
  var i, attr, pathTag = document.createElementNS('http://www.w3.org/2000/svg','path');
  for(i = 0; i < element.attributes.length; i++) {
    attr = element.attributes[i];
    if (this.ATTR_WATCH.indexOf(attr.name) === -1) {
      pathTag.setAttribute(attr.name, attr.value);
    }
  }
  for(i in pathData) {
    pathTag.setAttribute(i, pathData[i]);
  }
  return pathTag;
};

/**
 * Parse attributes of a DOM element to
 * get an object of attribute => value
 *
 * @param  {NamedNodeMap} attributes Attributes object from DOM element to parse
 * @return {object}                  Object of attributes
 */
Pathformer.prototype.parseAttr = function (element) {
  var attr, output = {};
  for (var i = 0; i < element.length; i++) {
    attr = element[i];
    // Check if no data attribute contains '%', or the transformation is impossible
    if (this.ATTR_WATCH.indexOf(attr.name) !== -1 && attr.value.indexOf('%') !== -1) {
      throw new Error('Pathformer [parseAttr]: a SVG shape got values in percentage. This cannot be transformed into \'path\' tags. Please use \'viewBox\'.');
    }
    output[attr.name] = attr.value;
  }
  return output;
};

var fs  = require("fs"),
  path  = require("path"),
  input = fs.readFileSync(path.join(__dirname, process.argv.slice(2)[0]))
            .toString();
  jsdom = require("jsdom"),
  document = jsdom.jsdom(input);

new Pathformer(document);
