(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('EventsCtrl', EventsCtrl);

	EventsCtrl.$inject = ['Fire', 'Event', '$location'];

	function EventsCtrl(Fire, Event, $location) {
		var events = this;

		events.allEvents = Fire.events();

		// synchronously retrieve user data
		events.user = Fire.ref.getAuth();

		/**
		 * Link to an event detail page
		 *
		 * @param evtId {string} event ID
		 */
		events.linkToEvent = function(evtId) {
			$location.path('/event/' + evtId);
		};

		/**
		 * Function for successful API call getting events list
		 *
		 * @param data {Array} promise provided by $http success
		 * @private
		 */
		function _eventsSuccess(data) {
			Event.allEventsExpired(events.allEvents);
			events.eventsReady = true;
		}
		events.allEvents.$loaded().then(_eventsSuccess);

		/**
		 * Custom sort function
		 * Get event start date and change to real date to sort by
		 *
		 * @param evt {object} event object
		 * @returns {Date}
		 */
		events.sortStartDate = function(evt) {
			return Event.getJSDatetime(evt.startDate, evt.startTime);
		};
	}
})();