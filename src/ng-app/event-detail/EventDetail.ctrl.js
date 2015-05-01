(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('EventDetailCtrl', EventDetailCtrl);

	EventDetailCtrl.$inject = ['$scope', '$rootScope', '$routeParams', 'Fire', 'Event'];

	function EventDetailCtrl($scope, $rootScope, $routeParams, Fire, Event) {
		var event = this;
		var _eventId = $routeParams.eventId;

		event.data = Fire.data();

		// synchronously retrieve user data
		event.user = Fire.ref.getAuth();

		event.showModal = false;

		/**
		 * Open RSVP modal window
		 */
		event.openRsvpModal = function() {
			event.showModal = true;
		};

		var rsvps = Fire.rsvps();

		/**
		 * Process RSVP and update UI appropriately
		 *
		 * @private
		 */
		function _processMyRsvp() {
			event.noRsvp = !event.rsvpObj;

			var guests = !event.noRsvp ? event.rsvpObj.guests : null;

			if (!event.noRsvp && !!guests === false || guests == 1) {
				event.guestText = event.rsvpObj.name + ' is';
			} else if (guests && guests > 1) {
				event.guestText = event.rsvpObj.name + ' + ' + (guests - 1) + ' are ';
			}

			event.attendingText = !event.noRsvp && event.rsvpObj.attending ? 'attending' : 'not attending';
			event.rsvpBtnText = event.noRsvp ? 'RSVP' : 'Update my RSVP';
			event.showEventDownload = event.rsvpObj && event.rsvpObj.attending;
			event.createOrUpdate = event.noRsvp ? 'create' : 'update';
			event.rsvpReady = true;
		}

		/**
		 * RSVPs have been fetched successfully
		 *
		 * @param data {object} returned from promise
		 * @private
		 */
		function _rsvpsLoadedSuccess(data) {
			var _rsvps = data;

			for (var i = 0; i < _rsvps.length; i++) {
				var thisRsvp = _rsvps[i];

				if (thisRsvp.eventId === _eventId && thisRsvp.userId === event.user.uid) {
					event.rsvpObj = thisRsvp;
					break;
				}
			}

			_processMyRsvp();
		}

		// initial load of RSVPs
		rsvps.$loaded().then(_rsvpsLoadedSuccess);

		// watch for RSVP updates
		rsvps.$watch(function(event) {
			if (event.event === 'child_changed') {
				event.rsvpObj = rsvps.$getRecord(event.key);
				_processMyRsvp();
			}
		});

		/**
		 * Generate .ics file for this event
		 *
		 * @private
		 */
		function _generateIcal() {
			event.cal = ics();

			var _startD = Event.getJSDatetime(event.detail.startDate, event.detail.startTime),
				_endD = Event.getJSDatetime(event.detail.endDate, event.detail.endTime);

			event.cal.addEvent(event.detail.title, event.detail.description, event.detail.location, _startD, _endD);
		}

		/**
		 * Download .ics file
		 */
		event.downloadIcs = function() {
			event.cal.download();
		};

		var events = Fire.events();

		/**
		 * Function for successful API call getting single event detail
		 *
		 * @param data {object} promise provided by $http success
		 * @private
		 */
		function _eventSuccess(data) {
			event.detail = events.$getRecord(_eventId);
			event.detail.prettyDate = Event.getPrettyDatetime(event.detail);
			event.detail.expired = Event.expired(event.detail);
			event.eventReady = true;
		}

		events.$loaded(_eventSuccess);

		var _watchRsvpReady = $scope.$watch('event.rsvpReady', function(newVal, oldVal) {
			if (newVal && event.detail && event.detail.rsvp) {
				_generateIcal();
				_watchRsvpReady();
			}
		});
	}
})();