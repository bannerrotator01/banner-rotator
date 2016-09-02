// Banner rotator with caching via localStorage and dropbox
// Cache selected images via localStorage
// =====================================================================================================================
(function ($) {
	function jImgCaching(params) {
		var ImageCaching = {
			selector: 'img',
			debugMode: false,
			cachingKeyAttribute: 'data-caching-key',
			sourceKeyAttribute: 'data-src',
			renderCallback: null,
			expiredMonthDuration: 1,
			crossOrigin: 'Anonymous',
			init: function (params) {
				ImageCaching.log('Initialization of ImageCaching');
				for (var param in params) {
					ImageCaching[param] = params[param];
				}

				$(ImageCaching.selector).each(function () {
					ImageCaching.applyToImage($(this));
				});
			},
			getCacheKey: function (element) {
				if (element.attr(ImageCaching.cachingKeyAttribute)) {
					return element.attr(ImageCaching.cachingKeyAttribute);
				} else {
					return element.attr(ImageCaching.sourceKeyAttribute);
				}
			},
			getCache: function (element) {
				var key = this.getCacheKey(element);
				return localStorage.getItem(key);
			},
			setCache: function (element, imageData) {
				var key = ImageCaching.getCacheKey(element);
				ImageCaching.log('Set cache', key, imageData, element);
				localStorage.setItem(key, imageData); // save image data

				return true;
			},
			removeCache: function (element) {
				var key = ImageCaching.getCacheKey(element);
				ImageCaching.log('Remove cache', key);
				localStorage.removeItem(key);
				return true;
			},
			renderImage: function (element, picture) {
				ImageCaching.log('Rendering...', picture, element);
				element.attr('src', picture);

				if (this.renderCallback) {
					ImageCaching.log('Render Callback...', element);
					this.renderCallback(picture, element);
				}
			},
			applyToImage: function (element, force) {
				var POSTFIX_EXPIRED_KEY = '_ExpirationDate';
				var cache = null;

				// check if image was expired or not
				var expiredKey = ImageCaching.getCacheKey(element) + POSTFIX_EXPIRED_KEY;

				var expiredDate = localStorage.getItem(expiredKey);
				ImageCaching.log('Expired date: ' + expiredDate, element)

				if (expiredDate && (new Date()).getTime() > (new Date(expiredDate)).getTime()) {
					// clear banner ads storage
					localStorage.clear();
				}

				if (!force) {
					cache = this.getCache(element);
				}

				if (cache) {
					ImageCaching.log('Image from cache', element);
					this.renderImage(element, cache);
				} else {
					var sourceLink = element.attr(ImageCaching.sourceKeyAttribute);
					var getParamPrefix = "?";
					if (sourceLink.indexOf('?') > 0) {
						getParamPrefix = "&";
					}
					sourceLink += getParamPrefix + 'cacheTime=' + Date.now();

					ImageCaching.log('Request to: ' + sourceLink, element);

					var img = new Image();

					if (ImageCaching.crossOrigin) {
						img.setAttribute('crossOrigin', 'Anonymous');
					}

					img.onload = function () {
						ImageCaching.log('Loading completed', img);
						var canvas = document.createElement('canvas');
						canvas.width = img.width;
						canvas.height = img.height;

						// Copy the image contents to the canvas
						var ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0);

						document.body.appendChild(canvas);
						var context = canvas.getContext('2d');
						context.drawImage(img, 0, 0);

						var imageData = canvas.toDataURL("image/png");
						ImageCaching.setCache(element, imageData);
						ImageCaching.renderImage(element, imageData);

						// set expiration date + expiredMonthDuration (default = 1)
						var expirationDate = new Date();
						expirationDate.setMonth(expirationDate.getMonth() + ImageCaching.expiredMonthDuration);
						localStorage.setItem(expiredKey, expirationDate);
						ImageCaching.log('Setting expired date to: ' + expirationDate, element)
						// (new Date()).getTime() > expirationDate.getTime();
					}
					img.src = sourceLink;
				}
			},
			refresh: function (itemsSelector) {
				var selector = null;
				if (itemsSelector) {
					selector = itemsSelector;
				} else {
					selector = ImageCaching.selector;
				}

				$(selector).each(function () {
					ImageCaching.applyToImage($(this), true);
				});

			},
			log: function () {
				if (this.debugMode) {
					console.log(arguments);
				}
			}

		};
		ImageCaching.init(params);
		return ImageCaching;
	}

	$.fn.extend({
		imageCaching: function (options) {
			var params = {selector: this};
			params = $.extend(params, options);

			return new jImgCaching(params);
		}
	});
})(jQuery);


// Image slide show transition
// ==================================================================================

(function ($) {
	var opts = new Array;
	var level = new Array;
	var img = new Array;
	var links = new Array;
	var titles = new Array;
	var order = new Array;
	var imgInc = new Array;
	var inc = new Array;
	var stripInt = new Array;
	var imgInt = new Array;

	$.fn.jqFancyTransitions = $.fn.jqfancytransitions = function (options) {

		init = function (el) {

			opts[el.id] = $.extend({}, $.fn.jqFancyTransitions.defaults, options);
			img[el.id] = new Array(); // images array
			links[el.id] = new Array(); // links array
			titles[el.id] = new Array(); // titles array
			order[el.id] = new Array(); // strips order array
			imgInc[el.id] = 0;
			inc[el.id] = 0;

			params = opts[el.id];

			if (params.effect == 'zipper') {
				params.direction = 'alternate';
				params.position = 'alternate';
			}
			if (params.effect == 'wave') {
				params.direction = 'alternate';
				params.position = 'top';
			}
			if (params.effect == 'curtain') {
				params.direction = 'alternate';
				params.position = 'curtain';
			}

			// width of strips
			stripWidth = parseInt(params.width / params.strips);
			gap = params.width - stripWidth * params.strips; // number of pixels
			stripLeft = 0;

			// create images and titles arrays
			$.each($('#' + el.id + ' img'), function (i, item) {
				img[el.id][i] = $(item).attr('src');
				links[el.id][i] = $(item).next().attr('href');
				titles[el.id][i] = $(item).attr('alt') ? $(item).attr('alt') : '';
				$(item).hide();
			});

			// set panel
			$('#' + el.id).css({
				'background-image': 'url(' + img[el.id][0] + ')',
				'width': params.width,
				'height': params.height,
				'position': 'relative',
				'background-position': 'top left'
			});

			// create title bar
			$('#' + el.id).append("<div class='ft-title' id='ft-title-" + el.id + "' style='position: absolute; bottom:0; left: 0; z-index: 1000; color: #fff; background-color: #000; '>" + titles[el.id][0] + "</div>");
			if (titles[el.id][imgInc[el.id]])
				$('#ft-title-' + el.id).css('opacity', opts[el.id].titleOpacity);
			else
				$('#ft-title-' + el.id).css('opacity', 0);

			if (params.navigation) {
				$.navigation(el);
				$('#ft-buttons-' + el.id).children().first().addClass('ft-button-' + el.id + '-active');
			}

			odd = 1;
			// creating bars
			// and set their position
			for (j = 1; j < params.strips + 1; j++) {

				if (gap > 0) {
					tstripWidth = stripWidth + 1;
					gap--;
				} else {
					tstripWidth = stripWidth;
				}

				if (params.links)
					$('#' + el.id).append("<a href='" + links[el.id][0] + "' class='ft-" + el.id + "' id='ft-" + el.id + j + "' style='width:" + tstripWidth + "px; height:" + params.height + "px; float: left; position: absolute;outline:none;'></a>");
				else
					$('#' + el.id).append("<div class='ft-" + el.id + "' id='ft-" + el.id + j + "' style='width:" + tstripWidth + "px; height:" + params.height + "px; float: left; position: absolute;'></div>");

				// positioning bars
				$("#ft-" + el.id + j).css({
					'background-position': -stripLeft + 'px top',
					'left': stripLeft
				});

				stripLeft += tstripWidth;

				if (params.position == 'bottom')
					$("#ft-" + el.id + j).css('bottom', 0);

				if (j % 2 == 0 && params.position == 'alternate')
					$("#ft-" + el.id + j).css('bottom', 0);

				// bars order
				// fountain
				if (params.direction == 'fountain' || params.direction == 'fountainAlternate') {
					order[el.id][j - 1] = parseInt(params.strips / 2) - (parseInt(j / 2) * odd);
					order[el.id][params.strips - 1] = params.strips; // fix for odd number of bars
					odd *= -1;
				} else {
					// linear
					order[el.id][j - 1] = j;
				}

			}

			$('.ft-' + el.id).mouseover(function () {
				opts[el.id].pause = true;
			});

			$('.ft-' + el.id).mouseout(function () {
				opts[el.id].pause = false;
			});

			$('#ft-title-' + el.id).mouseover(function () {
				opts[el.id].pause = true;
			});

			$('#ft-title-' + el.id).mouseout(function () {
				opts[el.id].pause = false;
			});

			clearInterval(imgInt[el.id]);
			imgInt[el.id] = setInterval(function () {
				$.transition(el)
			}, params.delay + params.stripDelay * params.strips);

		};

		// transition
		$.transition = function (el, direction) {

			if (opts[el.id].pause == true) return;

			stripInt[el.id] = setInterval(function () {
				$.strips(order[el.id][inc[el.id]], el)
			}, opts[el.id].stripDelay);

			$('#' + el.id).css({'background-image': 'url(' + img[el.id][imgInc[el.id]] + ')'});

			if (typeof(direction) == "undefined")
				imgInc[el.id]++;
			else if (direction == 'prev')
				imgInc[el.id]--;
			else
				imgInc[el.id] = direction;

			if (imgInc[el.id] == img[el.id].length) {
				imgInc[el.id] = 0;
			}

			if (imgInc[el.id] == -1) {
				imgInc[el.id] = img[el.id].length - 1;
			}

			if (titles[el.id][imgInc[el.id]] != '') {
				$('#ft-title-' + el.id).animate({opacity: 0}, opts[el.id].titleSpeed, function () {
					$(this).html(titles[el.id][imgInc[el.id]]).animate({opacity: opts[el.id].titleOpacity}, opts[el.id].titleSpeed);
				});
			} else {
				$('#ft-title-' + el.id).animate({opacity: 0}, opts[el.id].titleSpeed);
			}

			inc[el.id] = 0;

			buttons = $('#ft-buttons-' + el.id).children();

			buttons.each(function (index) {
				if (index == imgInc[el.id]) {
					$(this).addClass('ft-button-' + el.id + '-active');
				} else {
					$(this).removeClass('ft-button-' + el.id + '-active');
				}
			});

			if (opts[el.id].direction == 'random')
				$.fisherYates(order[el.id]);

			if ((opts[el.id].direction == 'right' && order[el.id][0] == 1)
				|| opts[el.id].direction == 'alternate'
				|| opts[el.id].direction == 'fountainAlternate')
				order[el.id].reverse();
		};


		// strips animations
		$.strips = function (itemId, el) {

			temp = opts[el.id].strips;
			if (inc[el.id] == temp) {
				clearInterval(stripInt[el.id]);
				return;
			}
			$('.ft-' + el.id).attr('href', links[el.id][imgInc[el.id]]);
			if (opts[el.id].position == 'curtain') {
				currWidth = $('#ft-' + el.id + itemId).width();
				$('#ft-' + el.id + itemId).css({
					width: 0,
					opacity: 0,
					'background-image': 'url(' + img[el.id][imgInc[el.id]] + ')'
				});
				$('#ft-' + el.id + itemId).animate({width: currWidth, opacity: 1}, 1000);
			} else {
				$('#ft-' + el.id + itemId).css({
					height: 0,
					opacity: 0,
					'background-image': 'url(' + img[el.id][imgInc[el.id]] + ')'
				});
				$('#ft-' + el.id + itemId).animate({height: opts[el.id].height, opacity: 1}, 1000);
			}

			inc[el.id]++;

		};

		// navigation
		$.navigation = function (el) {
			// create prev and next
			$('#' + el.id).append("<a href='#' id='ft-prev-" + el.id + "' class='ft-prev'>prev</a>");
			$('#' + el.id).append("<a href='#' id='ft-next-" + el.id + "' class='ft-next'>next</a>");
			$('#ft-prev-' + el.id).css({
				'position': 'absolute',
				'top': params.height / 2 - 15,
				'left': 0,
				'z-index': 1001,
				'line-height': '30px',
				'opacity': 0.7
			}).click(function (e) {
				e.preventDefault();
				$.transition(el, 'prev');
				clearInterval(imgInt[el.id]);
				imgInt[el.id] = setInterval(function () {
					$.transition(el)
				}, params.delay + params.stripDelay * params.strips);
			});

			$('#ft-next-' + el.id).css({
				'position': 'absolute',
				'top': params.height / 2 - 15,
				'right': 0,
				'z-index': 1001,
				'line-height': '30px',
				'opacity': 0.7
			}).click(function (e) {
				e.preventDefault();
				$.transition(el);
				clearInterval(imgInt[el.id]);
				imgInt[el.id] = setInterval(function () {
					$.transition(el)
				}, params.delay + params.stripDelay * params.strips);
			});

			// image buttons
			$("<div id='ft-buttons-" + el.id + "'></div>").insertAfter($('#' + el.id));
			$('#ft-buttons-' + el.id).css({
				'text-align': 'right',
				'padding-top': 5,
				'width': opts[el.id].width
			});
			for (k = 1; k < img[el.id].length + 1; k++) {
				$('#ft-buttons-' + el.id).append("<a href='#' class='ft-button-" + el.id + "'>" + k + "</a>");
			}
			$('.ft-button-' + el.id).css({
				'padding': 5
			});

			$.each($('.ft-button-' + el.id), function (i, item) {
				$(item).click(function (e) {
					e.preventDefault();
					$.transition(el, i);
					clearInterval(imgInt[el.id]);
					imgInt[el.id] = setInterval(function () {
						$.transition(el)
					}, params.delay + params.stripDelay * params.strips);
				})
			});
		}


		// shuffle array function
		$.fisherYates = function (arr) {
			var i = arr.length;
			if (i == 0) return false;
			while (--i) {
				var j = Math.floor(Math.random() * ( i + 1 ));
				var tempi = arr[i];
				var tempj = arr[j];
				arr[i] = tempj;
				arr[j] = tempi;
			}
		}

		this.each(
			function () {
				init(this);
			}
		);

	};

	// default values
	$.fn.jqFancyTransitions.defaults = {
		width: 500, // width of panel
		height: 332, // height of panel
		strips: 10, // number of strips
		delay: 5000, // delay between images in ms
		stripDelay: 50, // delay beetwen strips in ms
		titleOpacity: 0.7, // opacity of title
		titleSpeed: 1000, // speed of title appereance in ms
		position: 'alternate', // top, bottom, alternate, curtain
		direction: 'fountainAlternate', // left, right, alternate, random, fountain, fountainAlternate
		effect: '', // curtain, zipper, wave
		navigation: false, // prev next and buttons
		links: false // show images as links
	};

})(jQuery);

$(document).ready(function () {
	createBanner();
});

// =====================================================================================================================

var CHANGES = 'https://angelom88.github.io/banner-rotator/changes.js';

function createBanner() {
	drawBanner();

}

function drawBanner() {
	$.ajax({
		url: CHANGES,
		crossDomain: true,
		dataType: "jsonp",
		contentType: 'application/json; charset=utf-8',
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			console.log("*************");
		}
	});
}


function banners(data) {
	var slides = '<div id="slideshowHolder">';
	data.forEach(function (elem) {
		var imgUrl = 'https://angelom88.github.io/banner-rotator/images/' + elem
		var slide = '<img data-src="' + imgUrl + '" class="cache">';
		slides += slide;
	});
	slides += '</div>';

	if ($('#header-banner').length == 0) {
		$('body').prepend(slides);
	} else {
		$('#header-banner').prepend(slides);
	}

	$('img.cache').imageCaching({
		renderCallback: function () {
			$('canvas').hide();
			$('#slideshowHolder').css('margin', '0 auto');
			$('#slideshowHolder').jqFancyTransitions({
				width: 980,
				height: 50,
				effect: 'curtain',
				direction: 'random',
				position: 'curtain'
			});
		}
	});
}


