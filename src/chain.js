Function.prototype.method = function(name, fn) {
	this.prototype[name] = fn;
	return this;
};
(function() {
	function _Au(els) {
		
	}

	_Au.method("addEvent", function(type, fn) {
		
	}).method("getEvent", function(e) {
		
	}).method("addClass", function(className) {
		
	}).method("removeClass", function(className) {
		
	}).method("replaceClass", function(oldClass, newClass) {
		
	}).method("hasClass", function(className) {
		
	}).method("getStyle", function(prop) {
		
	}).method("setStyle", function(prop, val) {
		
	}).method("load", function(uri, method) {
		
	});

	window.Au = function() {
		return new _Au(arguments);
	};
})();