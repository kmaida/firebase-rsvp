(function() {
	'use strict';

	angular
		.module('myApp')
		.filter('prettyDate', prettyDate);

	prettyDate.$inject = ['dateFilter'];

	function prettyDate(dateFilter) {
		/**
		 * Takes a date string and converts it to a pretty date
		 *
		 * @param dateStr {string}
		 */
		return function (dateStr) {
			var d = new Date(dateStr);

			prettyDate = dateFilter(d, 'MMM d, y');

			return prettyDate;
		};
	}
})();
