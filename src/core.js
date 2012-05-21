var Au = (function() {
    /*
     *
     * The structure of this lib is temporary
     * 
     */
    var Au = function() {

    },

    eventUtil = {
    	addHandler: function(element, type, handler) {
    		
    	},

    	removeHandler: function(element, type, handler) {
    		
    	}
	},

    loadScript = function(url, callback) {
        var script = document.createElement("script");
        script.type = "text/javascript";

        if(script.readyState) {
            script.onreadystatechange = function() {
                if(script.readyState === "loaded" || script.readyState === "complete") {
                    script.onreadystatechange = null;
                    callback();
                } 
            }; 
        }  else {
            script.onload = function() {
                callback();
            };
        }

        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    };

    return Au;
})();
