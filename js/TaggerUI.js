/*
Copyright 2008-2009 University of Toronto
Copyright 2008-2009 University of California, Berkeley
Copyright 2010-2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global window, fluid_1_4:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_4 = fluid_1_4 || {};

/*************
 * Tagger UI *
 *************/

 (function($, fluid){

    //we'll add some private methods here

    var enableElement = function(that, elm){
        elm.prop("disabled", false);
        elm.removeClass(that.options.styles.dim);
    };

    var disableElement = function(that, elm){
        elm.prop("disabled", true);
        elm.addClass(that.options.styles.dim);
    };

    var showElement = function(that, elm){
        elm.removeClass(that.options.styles.hidden);
    };

    var hideElement = function(that, elm){
        elm.addClass(that.options.styles.hidden);
    };

    var bindDOMEvents = function(that){
        that.locate("resizeButton").click(function(){
            //TODO: Bind resize event
            //that.start();
            });
    };


    var canvas
    var context;
    var WIDTH;
    var HEIGHT;
    var resizeFactor;
    var image;
    var imageX;
    var imageY;
    var taggerStarted;
    var rectX;
    var rectY;

    var mx, my; // mouse coordinates

	var offsetx, offsety;
	
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

    // The active tool instance.
    var tool;

    // Sets mx,my to the mouse position relative to the canvas
    // unfortunately this can be tricky, we have to worry about padding and borders
	function getMouse(e){
	    var element = canvas,
	    offsetX = 0,
	    offsetY = 0;
	
	    if (element.offsetParent){
	        do{
	            offsetX += element.offsetLeft;
	            offsetY += element.offsetTop;
	        }
	        while ((element = element.offsetParent));
	    }
	
	    // Add padding and border style widths to offset
	    offsetX += stylePaddingLeft;
	    offsetY += stylePaddingTop;
	
	    offsetX += styleBorderLeft;
	    offsetY += styleBorderTop;
	
	    mx = e.pageX - offsetX;
	    my = e.pageY - offsetY
	}

    taggerMouseDown = function(e){
        getMouse(e);
        
        taggerStarted = true;
        rectX = mx;
        rectY = my;
    };

    taggerMouseMove = function(e){
	    
	    if (!taggerStarted){
	        return;
	    }
	    
	    getMouse(e);
	    	
	    var x = Math.min(mx, rectX),
	    	y = Math.min(my, rectY),
	    	w = Math.abs(mx - rectX),
	    	h = Math.abs(my - rectY);
	    	
	    mainDraw(x, y, w, h);	    
	}

    taggerMouseUp = function(e){
    	getMouse(e);
        if (taggerStarted){
        	taggerStarted = false;
            taggerMouseMove(e);            
        }
    }

	function mainDraw(x, y, w, h) {	
		context.clearRect(0, 0, canvas.width, canvas.height);
		drawImage(context, image, resizeFactor);
	
	    if (!w || !h){
	        return;
	    }
	
	    context.strokeRect(x, y, w, h);	
	}
	
	function drawImage(imageCanvasContext, image, resizeFactor) {
		imageCanvasContext.drawImage(image, imageX, imageY, image.width/resizeFactor, image.height/resizeFactor);
	}
	
    /**
     * Instantiates a new TaggerUI component.
     * 
     * @param {Object} container the DOM element in which the Image Editor lives
     * @param {Object} options configuration options for the component.
     */
    fluid.taggerUI = function(container, options){
        var that = fluid.initView("fluid.taggerUI", container, options);

        that.init = function(a_canvas, a_resizeFactor, a_image, a_imageX, a_imageY){

            canvas = a_canvas;
            HEIGHT = canvas.height;
            WIDTH = canvas.width;
            context = canvas.getContext('2d');
            resizeFactor = a_resizeFactor;
            image = a_image;
            imageX = a_imageX;
            imageY = a_imageY;
            taggerStarted = false;

			//fixes a problem where double clicking causes text to get selected on the canvas
			canvas.onselectstart = function () {
				return false;
			}
			
			// fixes mouse co-ordinate problems when there's a border or padding
			// see getMouse for more detail
			if (document.defaultView && document.defaultView.getComputedStyle) {
				stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)     || 0;
				stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)      || 0;
				styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
				styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)  || 0;
			}
			
            // Attach the mousedown, mousemove and mouseup event listeners.
            canvas.onmousedown = taggerMouseDown;
            canvas.onmouseup = taggerMouseUp;
            canvas.onmousemove = taggerMouseMove;
        }
        
        that.reset = function() {
			canvas.onmousedown = null;
			canvas.onmouseup = null;
			canvas.onmousemove = null;
		}

        return that;
    }
    
    fluid.defaults("fluid.cropperUI", {
        gradeNames: "fluid.viewComponent"
    });
    
})(jQuery, fluid_1_4);