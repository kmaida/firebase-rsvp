(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('viewEventGuests', viewEventGuests);

	viewEventGuests.$inject = ['rsvpData'];

	function viewEventGuests(rsvpData) {

		viewEventGuestsCtrl.$inject = ['$scope'];

		function viewEventGuestsCtrl($scope) {
			// controllerAs syntax
			var g = this;

			$scope.$watch('g.eventId', function(newVal, oldVal) {
				/**
				 * Function for successful API call getting RSVPs for this event
				 *
				 * @param data {Array} guests array
				 * @private
				 */
				function _getGuestsSuccess(data) {
					var _totalGuests = 0;

					g.guests = data;

					for (var i = 0; i < g.guests.length; i++) {
						_totalGuests += g.guests[i].guests;
					}

					g.totalGuests = _totalGuests;
					g.guestsReady = true;
				}

				if (newVal) {
					g.guestsReady = false;

					rsvpData.getEventGuests(newVal).then(_getGuestsSuccess);
				}
			});

			/**
			 * Close this modal directive
			 */
			g.closeModal = function() {
				g.showModal = false;
			};
		}

		return {
			restrict: 'EA',
			scope: {
				eventId: '=',
				eventName: '=',
				showModal: '='
			},
			templateUrl: '/ng-app/admin/viewEventGuests.tpl.html',
			controller: viewEventGuestsCtrl,
			controllerAs: 'g',
			bindToController: true
		}
	}
})();