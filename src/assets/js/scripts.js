'use strict';

window.helpers = (function() {

	init();

	/**
	 * Initialize public window.helpers functions
	 */
	function init() {
		fixBrowsers();
	}

	/**
	 * Fix browser weirdness
	 * Correct Modernizr bugs
	 */
	function fixBrowsers() {
		var ua = navigator.userAgent.toLowerCase(),
			chrome = ua.lastIndexOf('chrome/') > 0,
			$html = $('html');
		
		// Modernizr 2 bug: Chrome on Windows 8 gives a false negative for transforms3d support
		// Google does not plan to fix this; https://code.google.com/p/chromium/issues/detail?id=129004
		if (chrome) {
			var chromeversion = ua.substr(ua.lastIndexOf('chrome/') + 7, 2);
			if (chromeversion >= 12 && $html.hasClass('no-csstransforms3d')) {
				$html
					.removeClass('no-csstransforms3d')
					.addClass('csstransforms3d');
			}
		}
	}
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG53aW5kb3cuaGVscGVycyA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0aW5pdCgpO1xyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHB1YmxpYyB3aW5kb3cuaGVscGVycyBmdW5jdGlvbnNcclxuXHQgKi9cclxuXHRmdW5jdGlvbiBpbml0KCkge1xyXG5cdFx0Zml4QnJvd3NlcnMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpeCBicm93c2VyIHdlaXJkbmVzc1xyXG5cdCAqIENvcnJlY3QgTW9kZXJuaXpyIGJ1Z3NcclxuXHQgKi9cclxuXHRmdW5jdGlvbiBmaXhCcm93c2VycygpIHtcclxuXHRcdHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxcclxuXHRcdFx0Y2hyb21lID0gdWEubGFzdEluZGV4T2YoJ2Nocm9tZS8nKSA+IDAsXHJcblx0XHRcdCRodG1sID0gJCgnaHRtbCcpO1xyXG5cdFx0XHJcblx0XHQvLyBNb2Rlcm5penIgMiBidWc6IENocm9tZSBvbiBXaW5kb3dzIDggZ2l2ZXMgYSBmYWxzZSBuZWdhdGl2ZSBmb3IgdHJhbnNmb3JtczNkIHN1cHBvcnRcclxuXHRcdC8vIEdvb2dsZSBkb2VzIG5vdCBwbGFuIHRvIGZpeCB0aGlzOyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9MTI5MDA0XHJcblx0XHRpZiAoY2hyb21lKSB7XHJcblx0XHRcdHZhciBjaHJvbWV2ZXJzaW9uID0gdWEuc3Vic3RyKHVhLmxhc3RJbmRleE9mKCdjaHJvbWUvJykgKyA3LCAyKTtcclxuXHRcdFx0aWYgKGNocm9tZXZlcnNpb24gPj0gMTIgJiYgJGh0bWwuaGFzQ2xhc3MoJ25vLWNzc3RyYW5zZm9ybXMzZCcpKSB7XHJcblx0XHRcdFx0JGh0bWxcclxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnbm8tY3NzdHJhbnNmb3JtczNkJylcclxuXHRcdFx0XHRcdC5hZGRDbGFzcygnY3NzdHJhbnNmb3JtczNkJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9