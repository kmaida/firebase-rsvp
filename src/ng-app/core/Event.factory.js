// Event functions
(function() {
	'use strict';

	angular
		.module('myApp')
		.factory('Event', Event);

	Event.$inject = ['Utils', '$filter'];

	function Event(Utils, $filter) {
		/**
		 * Generate a pretty date for UI display from the start and end datetimes
		 *
		 * @param eventObj {object} the event object
		 * @returns {string} pretty start and end date / time string
		 */
		function getPrettyDatetime(eventObj) {
			var startDate = eventObj.startDate,
				startD = new Date(startDate),
				startTime = eventObj.startTime,
				endDate = eventObj.endDate,
				endD = new Date(endDate),
				endTime = eventObj.endTime,
				dateFormatStr = 'MMM d yyyy',
				prettyStartDate = $filter('date')(startD, dateFormatStr),
				prettyEndDate = $filter('date')(endD, dateFormatStr),
				prettyDatetime;

			if (prettyStartDate === prettyEndDate) {
				// event starts and ends on the same day
				// Apr 29 2015, 12:00 PM - 5:00 PM
				prettyDatetime = prettyStartDate + ', ' + startTime + ' - ' + endTime;
			} else {
				// event starts and ends on different days
				// Dec 31 2014, 8:00 PM - Jan 1 2015, 11:00 AM
				prettyDatetime = prettyStartDate + ', ' + startTime + ' - ' + prettyEndDate + ', ' + endTime;
			}

			return prettyDatetime;
		}

		/**
		 * Get JavaScript Date from event date and time strings
		 * Robust to gather and normalize data and work with validation coming from different date formats
		 *
		 * @param date {string|Date}
		 * @param timeStr {string} hh:mm AM/PM
		 * @returns {Date}
		 */
		function getJSDatetime(date, timeStr) {
			if (typeof date === 'string') {
				return new Date(date + ' ' + timeStr);
			} else {
				var dateStr = $filter('date')(date, 'shortDate');
				return new Date(dateStr + ' ' + timeStr);
			}
		}

		/**
		 * Determine if event is expired
		 * (end date has passed current date)
		 * Times are ignored because of false positives
		 *
		 * @param evt {object} event object
		 * @returns {boolean}
		 *
		 * TODO: refactor to accept an event or date/time strings to compare to "now"
		 */
		function expired(evt) {
			var jsStartDate = getJSDatetime(evt.startDate, evt.startTime),
				now = new Date();

			return jsStartDate.getTime() < now.getTime();
		}

		/**
		 * Add expired key to all events in array
		 *
		 * @param allEvents {Array} events array
		 * @returns {Array}
		 */
		function allEventsExpired(allEvents) {
			for (var i = 0; i < allEvents.length; i++) {
				var thisEvt = allEvents[i];

				thisEvt.startDateJS = getJSDatetime(thisEvt.startDate, thisEvt.startTime);
				thisEvt.expired = expired(thisEvt);
			}

			return allEvents;
		}

		return {
			getPrettyDatetime: getPrettyDatetime,
			getJSDatetime: getJSDatetime,
			expired: expired,
			allEventsExpired: allEventsExpired
		};
	}
})();