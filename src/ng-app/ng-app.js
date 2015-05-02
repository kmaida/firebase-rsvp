angular
	.module('myApp', ['firebase', 'ngRoute', 'ngResource', 'ngSanitize', 'ngMessages', 'mediaCheck', 'ui.bootstrap']);
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('AccountCtrl', AccountCtrl);

	AccountCtrl.$inject = ['$scope', '$location', 'Fire', 'Utils', 'OAUTH', '$timeout'];

	function AccountCtrl($scope, $location, Fire, Utils, OAUTH, $timeout) {
		// controllerAs ViewModel
		var account = this;

		// TODO: show user's general information
		// TODO: show user's RSVPs
		// TODO: remove tabs (not necessary)

		account.data = Fire.data();

		// get user synchronously and grab necessary data to display
		account.user = Fire.ref.getAuth();
		account.logins = OAUTH.LOGINS;

		var _provider = account.user.provider;
		var _profile = account.user[_provider].cachedUserProfile;

		account.userName = account.user[_provider].displayName;
		account.userPicture = Utils.getUserPicture(account.user);

		var rsvpData = Fire.rsvps();

		function _getMyRsvps(data) {
			account.rsvps = [];

			var _allRsvps = data;

			for (var n = 0; n < _allRsvps.length; n++) {
				var _this = _allRsvps[n];

				if (_this.userId === account.user.uid) {
					account.rsvps.push(_this);
				}
			}

			account.rsvpsReady = true;
		}

		rsvpData.$loaded().then(_getMyRsvps);

		var _tab = $location.search().view;

		account.tabs = [
			{
				name: 'User Info',
				query: 'user-info'
			},
			{
				name: 'RSVPs',
				query: 'rsvps'
			}
		];

		account.currentTab = _tab ? _tab : 'user-info';

		/**
		 * Change tabs by watching for route update
		 */
		$scope.$on('$routeUpdate', function(event, next) {
			account.currentTab = next.params.view || 'user-info';
		});

		/**
		 * Get user's profile information
		 */
		account.getProfile = function() {
			/**
			 * Function for successful API call getting user's profile data
			 * Show Account UI
			 *
			 * @param data {object} promise provided by $http success
			 * @private
			 */
			function _getUserSuccess(data) {
				account.user = data;
				account.administrator = account.user.isAdmin;
				account.linkedAccounts = User.getLinkedAccounts(account.user, 'account');
				account.showAccount = true;
				account.rsvps = account.user.rsvps;
			}

			/**
			 * Function for error API call getting user's profile data
			 * Show an error alert in the UI
			 *
			 * @param error
			 * @private
			 */
			function _getUserError(error) {
				account.errorGettingUser = true;
			}

			userData.getUser().then(_getUserSuccess, _getUserError);
		};

	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('AdminCtrl', AdminCtrl);

	AdminCtrl.$inject = ['$scope', '$location', 'Fire'];

	function AdminCtrl($scope, $location, Fire) {
		// controllerAs ViewModel
		var admin = this;

		admin.user = Fire.ref.getAuth();

		// get data from the database
		admin.data = Fire.data();

		var _tab = $location.search().view;

		admin.tabs = [
			{
				name: 'Events',
				query: 'events'
			},
			{
				name: 'Add Event',
				query: 'add-event'
			}
		];

		admin.currentTab = _tab ? _tab : 'events';

		/**
		 * Change tabs by watching for route update
		 */
		$scope.$on('$routeUpdate', function(event, next) {
			admin.currentTab = next.params.view || 'events';
		});

		/**
		 * Show RSVPed guest modal
		 *
		 * @param eventId {string} event ID to get RSVPs for
		 * @param eventName {string} event name to get RSVPs for
		 */
		admin.showGuests = function(eventId, eventName) {
			admin.showGuestsEventId = eventId;
			admin.showGuestsEventName = eventName;
			admin.showModal = true;
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('AdminEventListCtrl', AdminEventListCtrl);

	AdminEventListCtrl.$inject = ['Fire', '$location', '$timeout', 'Event'];

	function AdminEventListCtrl(Fire, $location, $timeout, Event) {
		// controllerAs ViewModel
		var aEvt = this;

		aEvt.evtUrl = $location.protocol() + '://' + $location.host() + '/event/';

		/**
		 * Hide URL input field when blurred
		 */
		aEvt.blurUrlInput = function() {
			aEvt.copyInput = null;
		};

		/**
		 * Show URL input field when ID link is clicked
		 *
		 * @param index
		 */
		aEvt.showUrlInput = function(index) {
			aEvt.copyInput = index;

			$timeout(function() {
				angular.element('#e' + index).find('input').select();
			});
		};

		// get events from Firebase
		aEvt.events = Fire.events();

		/**
		 * Custom sort function
		 * Get event start date and change to real date to sort by
		 *
		 * @param evt {object} event object
		 * @returns {Date}
		 */
		aEvt.sortStartDate = function(evt) {
			return Event.getJSDatetime(evt.startDate, evt.startTime);
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('EditEventCtrl', EditEventCtrl);

	EditEventCtrl.$inject = ['Fire', '$routeParams', '$location', '$timeout'];

	function EditEventCtrl(Fire, $routeParams, $location, $timeout) {
		// controllerAs ViewModel
		var edit = this;

		// get the event ID
		var _eventId = $routeParams.eventId;

		// get events
		var events = Fire.events();

		// tabs
		edit.tabs = ['Update Details', 'Delete Event'];
		edit.currentTab = 0;

		/**
		 * Switch tabs
		 *
		 * @param index {number} tab index
		 */
		edit.changeTab = function(index) {
			edit.currentTab = index;
		};

		// synchronously retrieve user data
		edit.user = Fire.ref.getAuth();

		// get data from the database
		edit.data = Fire.data();

		/**
		 * Function for successful API call getting single event detail
		 *
		 * @param data {object} events data
		 * @private
		 */
		function _eventSuccess(data) {
			edit.editEvent = events.$getRecord(_eventId);
			edit.showEditForm = true;
		}

		events.$loaded(_eventSuccess);

		/**
		 * Reset the delete button to default state
		 *
		 * @private
		 */
		function _btnDeleteReset() {
			edit.btnDelete = false;
			edit.btnDeleteText = 'Delete Event';
		}

		_btnDeleteReset();

		/**
		 * Function returned on successful deletion of event
		 *
		 * @private
		 */
		function _deleteSuccess() {
			edit.btnDeleteText = 'Deleted!';
			edit.btnDelete = true;
			edit.editEvent = {};

			$timeout(function() {
				$location.path('/admin');
			}, 1500);
		}

		/**
		 * Function returned on error deleting event
		 *
		 * @private
		 */
		function _deleteError() {
			edit.btnDeleteText = 'Error deleting!';

			$timeout(_btnDeleteReset, 3000);
		}

		/**
		 * Delete the event
		 */
		edit.deleteEvent = function() {
			var rsvps = Fire.rsvps();

			edit.btnDeleteText = 'Deleting...';

			/**
			 * Delete all RSVPs associated with the deleted event
			 *
			 * @private
			 */
			function _deleteRsvps() {
				angular.forEach(rsvps, function(rsvp) {
					if (rsvp.eventId === edit.editEvent.$id) {
						rsvps.$remove(rsvp);
					}
				});
			}
			rsvps.$loaded().then(_deleteRsvps);

			// delete the event
			events.$remove(edit.editEvent).then(_deleteSuccess, _deleteError);
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('eventForm', eventForm);

	eventForm.$inject = ['Fire', '$timeout', '$location', '$filter', 'Event'];

	function eventForm(Fire, $timeout, $location, $filter, Event) {

		eventFormCtrl.$inject = ['$scope'];

		function eventFormCtrl($scope) {
			// controllerAs syntax
			var ef = this;

			// check if form is create or edit
			var _isCreate = !!ef.prefillModelId === false;
			var _isEdit = !!ef.prefillModelId === true;

			var events = Fire.events();

			ef.timeRegex = /^(0?[1-9]|1[012])(:[0-5]\d) [APap][mM]$/i;

			if (_isEdit) {
				events.$loaded().then(function () {
					ef.formModel = events.$getRecord(ef.prefillModelId);
				});
			}

			// prevent selecting dates in the past
			ef.minDate = new Date();

			ef.dateOptions = {
				showWeeks: false
			};

			ef.startDateOpen = false;
			ef.endDateOpen = false;

			/**
			 * Toggle the datepicker open/closed
			 *
			 * @param $event {object}
			 * @param dateName {string} startDate / endDate
			 */
			ef.toggleDatepicker = function($event, dateName) {
				$event.preventDefault();
				$event.stopPropagation();

				ef[dateName + 'Open'] = !ef[dateName + 'Open'];
			};

			/**
			 * Transform dates to a format AngularFire will save to Firebase
			 * AngularFire wontfix bug: https://github.com/firebase/angularfire/issues/381
			 *
			 * @return {string} mm/dd/yyyy
			 */
			function _formatDate(date) {
				return $filter('date')(date, 'MM/dd/yyyy');
			}

			/**
			 * On start date valid blur, update end date if empty
			 */
			ef.startDateBlur = function() {
				if (ef.formModel && ef.formModel.startDate && !ef.formModel.endDate) {
					ef.formModel.endDate = _formatDate(ef.formModel.startDate);
				}
			};

			/**
			 * Reset the state of the form Submit button
			 *
			 * @private
			 */
			function _btnSubmitReset() {
				ef.btnSaved = false;
				ef.btnSubmitText = _isCreate ? 'Submit' : 'Update';
			}

			/**
			 * Go to Events tab
			 *
			 * @private
			 */
			function _goToEvents() {
				$location.search('view', 'events');
			}

			_btnSubmitReset();

			/**
			 * Function for event API call succeeded
			 *
			 * @private
			 */
			function _eventSuccess(ref) {
				ef.btnSaved = true;
				ef.btnSubmitText = _isCreate ? 'Saved!' : 'Updated!';

				if (_isCreate) {
					ef.showRedirectMsg = true;
					$timeout(_goToEvents, 2500);
				}

				if (_isEdit) {
					ef.showUpdateDetailLink = true;
					$timeout(_btnSubmitReset, 2500);
				}
			}

			/**
			 * Function for event API call error
			 *
			 * @private
			 */
			function _eventError(err) {
				ef.btnSaved = 'error';
				ef.btnSubmitText = _isCreate ? 'Error saving!' : 'Error updating!';

				console.log(ef.btnSubmitText, err);

				$timeout(_btnSubmitReset, 3000);
			}

			/**
			 * Check if event start and end datetimes are a valid range
			 * Runs on blur of event dates/times
			 *
			 * @returns {boolean}
			 */
			ef.validateDaterange = function() {
				if (ef.formModel && ef.formModel.startDate && ef.formModel.startTime && ef.formModel.endDate && ef.formModel.endTime) {
					var startDatetime = Event.getJSDatetime(ef.formModel.startDate, ef.formModel.startTime),
						endDatetime = Event.getJSDatetime(ef.formModel.endDate, ef.formModel.endTime);

					ef.validDaterange = (startDatetime - endDatetime) < 0;
				}
			};

			/**
			 * Click submit button
			 * Submit new event to API
			 * Form @ eventForm.tpl.html
			 */
			ef.submitEvent = function() {
				ef.formModel.startDate = _formatDate(ef.formModel.startDate);
				ef.formModel.endDate = _formatDate(ef.formModel.endDate);

				/**
				 * Update RSVPs attached to this event
				 *
				 * @private
				 */
				function _updateRsvps() {
					angular.forEach(rsvps, function(rsvp) {
						if (rsvp.eventId === ef.formModel.$id && rsvp.eventName !== ef.formModel.title) {
							rsvp.eventName = ef.formModel.title;
							rsvps.$save(rsvp);
						}
					});
				}

				if (_isCreate) {
					events.$add(ef.formModel).then(_eventSuccess, _eventError);

				} else if (_isEdit) {
					var rsvps = Fire.rsvps();

					rsvps.$loaded().then(_updateRsvps);
					events.$save(ef.formModel).then(_eventSuccess, _eventError);
				}
			};
		}

		return {
			restrict: 'EA',
			scope: {
				prefillModelId: '@'
			},
			templateUrl: '/ng-app/admin/eventForm.tpl.html',
			controller: eventFormCtrl,
			controllerAs: 'ef',
			bindToController: true
		}
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('validateDateFuture', validateDateFuture);

	validateDateFuture.$inject = ['eventData', '$timeout', '$location', '$filter', 'Event'];

	function validateDateFuture() {

		validateDateFutureLink.$inject = ['$scope', '$elem', '$attrs', 'ngModel'];

		function validateDateFutureLink($scope, $elem, $attrs, ngModel) {
			var _now = new Date(),
				_yesterday = _now.setDate(_now.getDate() - 1);

			ngModel.$parsers.unshift(function(value) {
				var _d = Date.parse(value),
					_valid = _yesterday - _d < 0;

				ngModel.$setValidity('pastDate', _valid);

				return _valid ? value : undefined;
			});

			ngModel.$formatters.unshift(function(value) {
				var _d = Date.parse(value),
					_valid = _yesterday - _d < 0;

				ngModel.$setValidity('pastDate', _valid);
				return value;
			});
		}

		return {
			restrict: 'A',
			require: 'ngModel',
			link: validateDateFutureLink
		}
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('viewEventGuests', viewEventGuests);

	viewEventGuests.$inject = ['Fire'];

	function viewEventGuests(Fire) {

		viewEventGuestsCtrl.$inject = ['$scope'];

		function viewEventGuestsCtrl($scope) {
			// controllerAs syntax
			var g = this;

			var rsvpData = Fire.rsvps();

			function _rsvpDataLoaded(data) {
				var _allRsvps = data;

				/**
				 * Set up guestlist for view
				 * Set up guest counts for view
				 *
				 * @param eventGuests {Array} guests who have RSVPed to specific event
				 * @private
				 */
				function _showEventGuests(eventGuests) {
					var _totalGuests = 0;

					g.guests = eventGuests;

					for (var i = 0; i < g.guests.length; i++) {
						var _thisGuest = g.guests[i];

						if (_thisGuest.attending) {
							_totalGuests += _thisGuest.guests;
						}
					}

					g.totalGuests = _totalGuests;
					g.guestsReady = true;
				}

				/**
				 * $watch event ID and collect updated sets of guests
				 */
				$scope.$watch('g.eventId', function (newVal, oldVal) {
					if (newVal) {
						var _eventGuests = [];
						g.guestsReady = false;

						for (var n = 0; n < _allRsvps.length; n++) {
							var _thisGuest = _allRsvps[n];

							if (_thisGuest.eventId === g.eventId) {
								_eventGuests.push(_thisGuest);
							}
						}

						_showEventGuests(_eventGuests);
					}
				});
			}

			rsvpData.$loaded().then(_rsvpDataLoaded);

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
		 *
		 * @param dateStr {string} mm/dd/yyy
		 * @param timeStr {string} hh:mm AM/PM
		 * @returns {Date}
		 */
		function getJSDatetime(dateStr, timeStr) {
			var d = new Date(dateStr),
				timeArr = timeStr.split(' '),
				time = timeArr[0].split(':'),
				hours = time[0] * 1,
				minutes = time[1] * 1,
				ampm = timeArr[1],
				fulldate;

			if (ampm == 'PM') {
				if (hours !== 12) {
					hours = hours + 12;
				}
			}

			fulldate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);

			return fulldate;
		}

		/**
		 * Determine if event is expired
		 * (end date/time has passed current date/time)
		 *
		 * @param evt {object} event object
		 * @returns {boolean}
		 */
		function expired(evt) {
			var jsStartDate = getJSDatetime(evt.endDate, evt.endTime),
				now = new Date();

			return jsStartDate < now;
		}

		return {
			getPrettyDatetime: getPrettyDatetime,
			getJSDatetime: getJSDatetime,
			expired: expired
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.factory('Fire', Fire);

	Fire.$inject = ['$firebaseAuth', '$firebaseObject', '$firebaseArray'];

	function Fire($firebaseAuth, $firebaseObject, $firebaseArray) {

		var uri = 'https://intense-heat-5822.firebaseio.com/';
		var ref = new Firebase(uri);

		/**
		 * Firebase authentication controls
		 *
		 * @returns {*} Authentication
		 */
		function auth() {
			return $firebaseAuth(ref);
		}

		/**
		 * Fetch Firebase data
		 *
		 * @returns {object} Firebase data object
		 */
		function data() {
			var _ref = new Firebase(uri + 'data');
			return $firebaseObject(_ref);
		}

		/**
		 * Fetch Firebase Events
		 *
		 * @returns {object} Firebase array
		 */
		function events() {
			var _ref = new Firebase(uri + 'events');
			return $firebaseArray(_ref);
		}

		/**
		 * Fetch Firebase RSVPs
		 *
		 * @returns {object} Firebase array
		 */
		function rsvps() {
			var _ref = new Firebase(uri + 'rsvps');
			return $firebaseArray(_ref);
		}

		return {
			uri: uri,
			ref: ref,
			auth: auth,
			data: data,
			events: events,
			rsvps: rsvps
		}
	}
})();
// media query constants
(function() {
	'use strict';

	angular
		.module('myApp')
		.constant('MQ', {
			SMALL: '(max-width: 767px)',
			LARGE: '(min-width: 768px)'
		});
})();
// login/Oauth constants
(function() {
	'use strict';

	angular
		.module('myApp')
		.constant('OAUTH', {
			LOGINS: [
				{
					account: 'google',
					name: 'Google',
					url: 'http://accounts.google.com'
				}, {
					account: 'twitter',
					name: 'Twitter',
					url: 'http://twitter.com'
				}, {
					account: 'facebook',
					name: 'Facebook',
					url: 'http://facebook.com'
				}, {
					account: 'github',
					name: 'GitHub',
					url: 'http://github.com'
				}
			]
		});
})();
// Utility functions
(function() {
	'use strict';

	angular
		.module('myApp')
		.factory('Utils', Utils);

	function Utils() {
		function getUserPicture(user) {
			var _provider = user.provider,
				_profile = user[_provider].cachedUserProfile;

			// TODO: turn this into a hashmap
			if (_provider === 'github') {
				return _profile.avatar_url;
			} else if (_provider === 'google') {
				return _profile.picture;
			} else if (_provider === 'twitter') {
				return _profile.profile_image_url;
			} else if (_provider === 'facebook') {
				return _profile.picture.data.url;
			}
		}

		/**
		 * Get ordinal value
		 *
		 * @param n {number} if a string is provided, % will attempt to convert to number
		 * @returns {string} th, st, nd, rd
		 */
		function getOrdinal(n) {
			var ordArr = ['th', 'st', 'nd', 'rd'],
				modulus = n % 100;

			return ordArr[(modulus - 20) % 10] || ordArr[modulus] || ordArr[0];
		}

		return {
			getUserPicture: getUserPicture,
			getOrdinal: getOrdinal
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.run(authRun);

	authRun.$inject = ['$rootScope', '$location', 'Fire'];

	function authRun($rootScope, $location, Fire) {
		$rootScope.$on('$routeChangeStart', function(event, next, current) {
			var _isAuthenticated = Fire.ref.getAuth();

			if (next && next.$$route && next.$$route.secure && !_isAuthenticated) {
				$rootScope.authPath = $location.path();

				$rootScope.$evalAsync(function() {
					// send user to login
					$location.path('/login');
				});
			}
		});
	}

})();
// routes
(function() {
	'use strict';

	angular
		.module('myApp')
		.config(appConfig);

	appConfig.$inject = ['$routeProvider', '$locationProvider'];

	function appConfig($routeProvider, $locationProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'ng-app/events/Events.view.html',
				secure: true
			})
			.when('/login', {
				templateUrl: 'ng-app/login/Login.view.html'
			})
			.when('/event/:eventId', {
				templateUrl: 'ng-app/event-detail/EventDetail.view.html',
				secure: true
			})
			.when('/event/:eventId/edit', {
				templateUrl: 'ng-app/admin/EditEvent.view.html',
				secure: true
			})
			.when('/account', {
				templateUrl: 'ng-app/account/Account.view.html',
				secure: true,
				reloadOnSearch: false
			})
			.when('/admin', {
				templateUrl: 'ng-app/admin/Admin.view.html',
				secure: true,
				reloadOnSearch: false
			})
			.otherwise({
				redirectTo: '/'
			});

		$locationProvider
			.html5Mode({
				enabled: true
			})
			.hashPrefix('!');
	}
})();
(function() {

	angular
		.module('myApp')
		.directive('detectAdblock', detectAdblock);

	detectAdblock.$inject = ['$timeout', '$location'];

	function detectAdblock($timeout, $location) {

		detectAdblockLink.$inject = ['$scope', '$elem', '$attrs'];

		function detectAdblockLink($scope, $elem, $attrs) {
			// data object
			$scope.ab = {};

			// hostname for messaging
			$scope.ab.host = $location.host();

			/**
			 * Check if ads are blocked - called in $timeout to let AdBlockers run
			 *
			 * @private
			 */
			function _areAdsBlocked() {
				var _a = $elem.find('.ad-test');

				$scope.ab.blocked = _a.height() <= 0 || !$elem.find('.ad-test:visible').length;
			}

			$timeout(_areAdsBlocked, 200);
		}

		return {
			restrict: 'EA',
			link: detectAdblockLink,
			template:   '<div class="ad-test fa-facebook fa-twitter" style="height:1px;"></div>' +
						'<div ng-if="ab.blocked" class="ab-message alert alert-danger">' +
							'<i class="fa fa-ban"></i> <strong>AdBlock</strong> is prohibiting important functionality! Please disable ad blocking on <strong>{{ab.host}}</strong>. This site is ad-free.' +
						'</div>'
		}
	}

})();
// User API $http calls
(function() {
	'use strict';

	angular
		.module('myApp')
		.service('eventData', eventData);

	/**
	 * GET promise response function
	 * Checks typeof data returned and succeeds if JS object, throws error if not
	 *
	 * @param response {*} data from $http
	 * @returns {*} object, array
	 * @private
	 */
	function _getRes(response) {
		if (typeof response.data === 'object') {
			return response.data;
		} else {
			throw new Error('retrieved data is not typeof object.');
		}
	}

	eventData.$inject = ['$http'];

	function eventData($http) {
		/**
		 * Get event by ID
		 *
		 * @param id {string} event MongoDB _id
		 * @returns {promise}
		 */
		this.getEvent = function(id) {
			return $http({
				method: 'GET',
				url: '/api/event/' + id
			}).then(_getRes);
		};

		/**
		 * Get all events
		 *
		 * @returns {promise}
		 */
		this.getAllEvents = function() {
			return $http
				.get('/api/events')
				.then(_getRes);
		};

		/**
		 * Create a new event
		 *
		 * @param eventData {object} new event data
		 * @returns {promise}
		 */
		this.createEvent = function(eventData) {
			return $http
				.post('/api/event/new', eventData);
		};

		/**
		 * Update an event
		 *
		 * @param eventData {object} updated event data
		 * @param id {string} event MongoDB _id
		 * @returns {promise}
		 */
		this.updateEvent = function(id, eventData) {
			return $http
				.put('/api/event/' + id, eventData);
		};

		/**
		 * Delete an event
		 *
		 * @param id {string} event MongoDB _id
		 * @returns {promise}
		 */
		this.deleteEvent = function(id) {
			return $http
				.delete('/api/event/' + id);
		}
	}
})();
// Fetch local JSON data
(function() {
	'use strict';

	angular
		.module('myApp')
		.service('localData', localData);

	/**
	 * GET promise response function
	 * Checks typeof data returned and succeeds if JS object, throws error if not
	 *
	 * @param response {*} data from $http
	 * @returns {*} object, array
	 * @private
	 */
	function _getRes(response) {
		if (typeof response.data === 'object') {
			return response.data;
		} else {
			throw new Error('retrieved data is not typeof object.');
		}
	}

	localData.$inject = ['$http'];

	function localData($http) {
		/**
		 * Get local JSON data file and return results
		 *
		 * @returns {promise}
		 */
		this.getJSON = function() {
			return $http
				.get('/ng-app/data/data.json')
				.then(_getRes);
		}
	}
})();
(function() {
	'use strict';

	var angularMediaCheck = angular.module('mediaCheck', []);

	angularMediaCheck.service('mediaCheck', ['$window', '$timeout', function ($window, $timeout) {
		this.init = function (options) {
			var $scope = options['scope'],
				query = options['mq'],
				debounce = options['debounce'],
				$win = angular.element($window),
				breakpoints,
				createListener = void 0,
				hasMatchMedia = $window.matchMedia !== undefined && !!$window.matchMedia('!').addListener,
				mqListListener,
				mmListener,
				debounceResize,
				mq = void 0,
				mqChange = void 0,
				debounceSpeed = !!debounce ? debounce : 250;

			if (hasMatchMedia) {
				mqChange = function (mq) {
					if (mq.matches && typeof options.enter === 'function') {
						options.enter(mq);
					} else {
						if (typeof options.exit === 'function') {
							options.exit(mq);
						}
					}
					if (typeof options.change === 'function') {
						options.change(mq);
					}
				};

				createListener = function () {
					mq = $window.matchMedia(query);
					mqListListener = function () {
						return mqChange(mq)
					};

					mq.addListener(mqListListener);

					// bind to the orientationchange event and fire mqChange
					$win.bind('orientationchange', mqListListener);

					// cleanup listeners when $scope is $destroyed
					$scope.$on('$destroy', function () {
						mq.removeListener(mqListListener);
						$win.unbind('orientationchange', mqListListener);
					});

					return mqChange(mq);
				};

				return createListener();

			} else {
				breakpoints = {};

				mqChange = function (mq) {
					if (mq.matches) {
						if (!!breakpoints[query] === false && (typeof options.enter === 'function')) {
							options.enter(mq);
						}
					} else {
						if (breakpoints[query] === true || breakpoints[query] == null) {
							if (typeof options.exit === 'function') {
								options.exit(mq);
							}
						}
					}

					if ((mq.matches && (!breakpoints[query]) || (!mq.matches && (breakpoints[query] === true || breakpoints[query] == null)))) {
						if (typeof options.change === 'function') {
							options.change(mq);
						}
					}

					return breakpoints[query] = mq.matches;
				};

				var convertEmToPx = function (value) {
					var emElement = document.createElement('div');

					emElement.style.width = '1em';
					emElement.style.position = 'absolute';
					document.body.appendChild(emElement);
					px = value * emElement.offsetWidth;
					document.body.removeChild(emElement);

					return px;
				};

				var getPXValue = function (width, unit) {
					var value;
					value = void 0;
					switch (unit) {
						case 'em':
							value = convertEmToPx(width);
							break;
						default:
							value = width;
					}
					return value;
				};

				breakpoints[query] = null;

				mmListener = function () {
					var parts = query.match(/\((.*)-.*:\s*([\d\.]*)(.*)\)/),
						constraint = parts[1],
						value = getPXValue(parseInt(parts[2], 10), parts[3]),
						fakeMatchMedia = {},
						windowWidth = $window.innerWidth || document.documentElement.clientWidth;

					fakeMatchMedia.matches = constraint === 'max' && value > windowWidth || constraint === 'min' && value < windowWidth;

					return mqChange(fakeMatchMedia);
				};

				var fakeMatchMediaResize = function () {
					clearTimeout(debounceResize);
					debounceResize = $timeout(mmListener, debounceSpeed);
				};

				$win.bind('resize', fakeMatchMediaResize);

				$scope.$on('$destroy', function () {
					$win.unbind('resize', fakeMatchMediaResize);
				});

				return mmListener();
			}
		};
	}]);
})();
// User API $http calls
(function() {
	'use strict';

	angular
		.module('myApp')
		.service('rsvpData', rsvpData);

	/**
	 * GET promise response function
	 * Checks typeof data returned and succeeds if JS object, throws error if not
	 *
	 * @param response {*} data from $http
	 * @returns {*} object, array
	 * @private
	 */
	function _getRes(response) {
		if (typeof response.data === 'object') {
			return response.data;
		} else {
			throw new Error('retrieved data is not typeof object.');
		}
	}

	rsvpData.$inject = ['$http'];

	function rsvpData($http) {
		/**
		 * Get all RSVPed guests for a specific event by event ID
		 *
		 * @param eventId {string} event MongoDB _id
		 * @returns {promise}
		 */
		this.getEventGuests = function(eventId) {
			return $http
				.get('/api/rsvps/event/' + eventId)
				.then(_getRes);
		};

		/**
		 * Create a new RSVP for an event
		 *
		 * @param eventId {string} event MongoDB _id
		 * @param rsvpData {object} new RSVP data
		 * @returns {promise}
		 */
		this.createRsvp = function(eventId, rsvpData) {
			return $http
				.post('/api/rsvp/event/' + eventId, rsvpData);
		};

		/**
		 * Update an RSVP by specific RSVP ID
		 *
		 * @param rsvpId {string} RSVP MongoDB _id
		 * @param rsvpData {object} updated RSVP data
		 * @returns {promise}
		 */
		this.updateRsvp = function(rsvpId, rsvpData) {
			return $http
				.put('/api/rsvp/' + rsvpId, rsvpData);
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.filter('trustAsHTML', trustAsHTML);

	trustAsHTML.$inject = ['$sce'];

	function trustAsHTML($sce) {
		return function (text) {
			return $sce.trustAsHtml(text);
		};
	}
})();
// For events based on viewport size - updates as viewport is resized
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('viewSwitch', viewSwitch);

	viewSwitch.$inject = ['mediaCheck', 'MQ', '$timeout'];

	function viewSwitch(mediaCheck, MQ, $timeout) {

		viewSwitchLink.$inject = ['$scope'];

		/**
		 * viewSwitch directive link function
		 *
		 * @param $scope
		 */
		function viewSwitchLink($scope) {
			// data object
			$scope.vs = {};

			/**
			 * Function to execute on enter media query
			 *
			 * @private
			 */
			function _enterFn() {
				$timeout(function () {
					$scope.vs.viewformat = 'small';
				});
			}

			/**
			 * Function to execute on exit media query
			 *
			 * @private
			 */
			function _exitFn() {
				$timeout(function () {
					$scope.vs.viewformat = 'large';
				});
			}

			// Initialize mediaCheck
			mediaCheck.init({
				scope: $scope,
				mq: MQ.SMALL,
				enter: _enterFn,
				exit: _exitFn
			});
		}

		return {
			restrict: 'EA',
			link: viewSwitchLink
		};
	}
})();
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

		event.openRsvpModal = function() {
			event.showModal = true;
		};

		/**
		 * Get user's RSVP for this event
		 *
		 * @private
		 */
		function _getUserRsvp() {
			var rsvps = Fire.rsvps();

			/**
			 * RSVPs have been fetched successfully
			 *
			 * @private
			 */
			function _rsvpsLoadedSuccess() {
				for (var i = 0; i < rsvps.length; i++) {
					var thisRsvp = rsvps[i];

					if (thisRsvp.eventId === _eventId && thisRsvp.userId === event.user.uid) {
						event.rsvpObj = thisRsvp;
						break;
					}
				}

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

			rsvps.$loaded().then(_rsvpsLoadedSuccess);
		}

		_getUserRsvp();

		// when RSVP has been submitted, update user data
		$rootScope.$on('rsvpSubmitted', _getUserRsvp);

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

			if (event.detail) {
				event.detail.prettyDate = Event.getPrettyDatetime(event.detail);
				event.detail.expired = Event.expired(event.detail);
			}

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
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('rsvpForm', rsvpForm);

	rsvpForm.$inject = ['Fire', '$timeout', '$rootScope'];

	function rsvpForm(Fire, $timeout, $rootScope) {

		rsvpFormCtrl.$inject = ['$scope'];

		function rsvpFormCtrl($scope) {
			// controllerAs syntax
			var rf = this;

			// check if form is create or edit (does the model already exist or not)
			var _isCreate = !!rf.formModelId === false;
			var _isEdit = !!rf.formModelId === true;

			// get RSVPs
			var rsvps;

			rf.numberRegex = /^([1-9]|10)$/;

			/**
			 * Get the RSVP that should be edited
			 *
			 * @private
			 */
			function _getEditRsvp() {
				rsvps = Fire.rsvps();

				rsvps.$loaded(function () {
					rf.formModel = rsvps.$getRecord(rf.formModelId);
				});
			}

			if (_isCreate) {
				rsvps = Fire.rsvps();

				rf.formModel = {
					userId: rf.userId,
					eventName: rf.event.title,
					eventId: rf.event.$id,
					name: rf.userName
				};
			} else if (_isEdit) {
				_getEditRsvp();
			}

			/**
			 * Wrap $watch in a function so that it can be re-initialized after it's been deregistered
			 */
			function _startWatchAttending() {
				/**
				 * Watch user's attending input and if true, set default number of guests to 1
				 *
				 * @type {*|function()}
				 * @private
				 */
				var _watchAttending = $scope.$watch('rf.formModel.attending', function (newVal, oldVal) {
					if (newVal === true && !oldVal && !rf.formModel.guests) {
						rf.formModel.guests = 1;

						// deregister $watch
						_watchAttending();
					}
				});
			}

			// start watching rf.formModel.attending
			_startWatchAttending();

			/**
			 * Reset the state of the form Submit button
			 *
			 * @private
			 */
			function _btnSubmitReset() {
				rf.btnSaved = false;
				rf.btnSubmitText = _isCreate ? 'Submit RSVP' : 'Update RSVP';
			}

			_btnSubmitReset();

			/**
			 * Function for RSVP API call succeeded
			 *
			 * @private
			 */
			function _rsvpSuccess() {
				rf.btnSaved = true;
				rf.btnSubmitText = _isCreate ? 'Submitted!' : 'Updated!';

				$rootScope.$broadcast('rsvpSubmitted');

				// user has submitted an RSVP; update create/edit status in case they edit without refreshing
				_isCreate = false;
				_isEdit = true;

				// restart $watch on rf.formModel.attending
				_startWatchAttending();

				$timeout(function() {
					_btnSubmitReset();
					rf.showModal = false;
				}, 1000);
			}

			$rootScope.$on('rsvpSubmitted', _getEditRsvp);

			/**
			 * Function for RSVP API call error
			 *
			 * @private
			 */
			function _rsvpError(err) {
				rf.btnSaved = 'error';
				rf.btnSubmitText = _isCreate ? 'Error submitting!' : 'Error updating!';

				console.log(rf.btnSubmitText, err);

				$timeout(_btnSubmitReset, 3000);
			}

			/**
			 * Click submit button
			 * Submit RSVP to API
			 * Form @ rsvpForm.tpl.html
			 */
			rf.submitRsvp = function() {
				rf.btnSubmitText = 'Sending...';

				if (!rf.formModel.attending) {
					rf.formModel.guests = 0;
				}

				if (_isCreate) {
					rsvps.$add(rf.formModel).then(_rsvpSuccess, _rsvpError);

				} else if (_isEdit) {
					rsvps.$save(rf.formModel).then(_rsvpSuccess, _rsvpError);
				}
			};

			/**
			 * Click function to close the modal window
			 */
			rf.closeModal = function() {
				rf.showModal = false;
			}
		}

		return {
			restrict: 'EA',
			scope: {
				event: '=',
				userName: '@',
				userId: '@',
				formModelId: '@',
				showModal: '='
			},
			templateUrl: '/ng-app/event-detail/rsvpForm.tpl.html',
			controller: rsvpFormCtrl,
			controllerAs: 'rf',
			bindToController: true
		}
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('EventsCtrl', EventsCtrl);

	EventsCtrl.$inject = ['Fire', 'Event'];

	function EventsCtrl(Fire, Event) {
		var events = this;

		events.allEvents = Fire.events();

		// synchronously retrieve user data
		events.user = Fire.ref.getAuth();

		/**
		 * Function for successful API call getting events list
		 *
		 * @param data {Array} promise provided by $http success
		 * @private
		 */
		function _eventsSuccess(data) {
			for (var i = 0; i < events.allEvents.length; i++) {
				var thisEvt = events.allEvents[i];

				thisEvt.startDateJS = Event.getJSDatetime(thisEvt.startDate, thisEvt.startTime);
				thisEvt.expired = Event.expired(thisEvt);
			}

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
(function() {
	'use strict';

	angular
		.module('myApp')
		.filter('prettyDate', prettyDate);

	function prettyDate() {
		/**
		 * Takes a date string and converts it to a pretty date
		 *
		 * @param dateStr {string}
		 */
		return function (dateStr) {
			var d = new Date(dateStr),
				monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
				month = monthsArr[d.getMonth()],
				day = d.getDate(),
				year = d.getFullYear(),
				prettyDate;

			prettyDate = month + ' ' + day + ', ' + year;

			return prettyDate;
		};
	}
})();

(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('HeaderCtrl', headerCtrl);

	headerCtrl.$inject = ['$location', 'localData', 'Fire', '$rootScope'];

	function headerCtrl($location, localData, Fire, $rootScope) {
		// controllerAs ViewModel
		var header = this;

		// authentication controls
		var _auth = Fire.auth();

		/**
		 * Get the local data from JSON
		 *
		 * @param data
		 * @private
		 */
		function _localDataSuccess(data) {
			header.localData = data;
		}

		localData.getJSON().then(_localDataSuccess);

		// get data from the database
		header.data = Fire.data();
		header.user = Fire.ref.getAuth();

		/**
		 * Success function from authenticating
		 *
		 * @param authData {object}
		 */
		function _onAuthCb(authData) {
			header.user = authData;

			if (!authData) {
				$location.path('/login');
			}
		}

		// on login or logout
		_auth.$onAuth(_onAuthCb);

		/**
		 * Log the user out of whatever authentication they've signed in with
		 */
		header.logout = function() {
			_auth.$unauth();
		};

		/**
		 * Currently active nav item when '/' index
		 *
		 * @param {string} path
		 * @returns {boolean}
		 */
		header.indexIsActive = function(path) {
			// path should be '/'
			return $location.path() === path;
		};

		/**
		 * Currently active nav item
		 *
		 * @param {string} path
		 * @returns {boolean}
		 */
		header.navIsActive = function(path) {
			return $location.path().substr(0, path.length) === path;
		};
	}

})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('navControl', navControl);

	navControl.$inject = ['mediaCheck', 'MQ', '$timeout'];

	function navControl(mediaCheck, MQ, $timeout) {

		navControlLink.$inject = ['$scope', '$element', '$attrs'];

		function navControlLink($scope) {
			// data object
			$scope.nav = {};

			var _body = angular.element('body'),
				_navOpen;

			/**
			 * Open mobile navigation
			 *
			 * @private
			 */
			function _openNav() {
				_body
					.removeClass('nav-closed')
					.addClass('nav-open');

				_navOpen = true;
			}

			/**
			 * Close mobile navigation
			 *
			 * @private
			 */
			function _closeNav() {
				_body
					.removeClass('nav-open')
					.addClass('nav-closed');

				_navOpen = false;
			}

			/**
			 * Function to execute when entering mobile media query
			 * Close nav and set up menu toggling functionality
			 *
			 * @private
			 */
			function _enterMobile() {
				_closeNav();

				$timeout(function () {
					/**
					 * Toggle mobile navigation open/closed
					 */
					$scope.nav.toggleNav = function () {
						if (!_navOpen) {
							_openNav();
						} else {
							_closeNav();
						}
					};
				});

				$scope.$on('$locationChangeSuccess', _closeNav);
			}

			/**
			 * Function to execute when exiting mobile media query
			 * Disable menu toggling and remove body classes
			 *
			 * @private
			 */
			function _exitMobile() {
				$timeout(function () {
					$scope.nav.toggleNav = null;
				});

				_body.removeClass('nav-closed nav-open');
			}

			// Set up functionality to run on enter/exit of media query
			mediaCheck.init({
				scope: $scope,
				mq: MQ.SMALL,
				enter: _enterMobile,
				exit: _exitMobile
			});
		}

		return {
			restrict: 'EA',
			link: navControlLink
		};
	}

})();

(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('LoginCtrl', LoginCtrl);

	LoginCtrl.$inject = ['Fire', 'OAUTH', '$rootScope', '$location', 'localData'];

	function LoginCtrl(Fire, OAUTH, $rootScope, $location, localData) {
		// controllerAs ViewModel
		var login = this;

		// Firebase authentication
		var _auth = Fire.auth();

		var _loggedIn = Fire.ref.getAuth();

		if (_loggedIn) {
			$location.path('/');
		}

		function _localDataSuccess(data) {
			login.localData = data;
		}

		localData.getJSON().then(_localDataSuccess);

		login.logins = OAUTH.LOGINS;

		/**
		 * Authenticate the user via Oauth with the specified provider
		 *
		 * @param {string} provider - (twitter, facebook, github, google)
		 */
		login.authenticate = function(provider) {
			login.loggingIn = true;

			/**
			 * Successfully authenticated
			 * Go to initially intended authenticated path
			 *
			 * @param response {object} promise response
			 * @private
			 */
			function _authSuccess(response) {
				login.loggingIn = false;

				if ($rootScope.authPath) {
					$location.path($rootScope.authPath);
				} else {
					$location.path('/');
				}
			}

			_auth.$authWithOAuthPopup(provider)
				.then(_authSuccess)
				.catch(function(response) {
					console.log(response.data);
					login.loggingIn = 'error';
					login.loginMsg = ''
				});
		};
	}
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUuanMiLCJhY2NvdW50L0FjY291bnQuY3RybC5qcyIsImFkbWluL0FkbWluLmN0cmwuanMiLCJhZG1pbi9BZG1pbkV2ZW50TGlzdC5jdHJsLmpzIiwiYWRtaW4vRWRpdEV2ZW50LmN0cmwuanMiLCJhZG1pbi9ldmVudEZvcm0uZGlyLmpzIiwiYWRtaW4vdmFsaWRhdGVEYXRlRnV0dXJlLmRpci5qcyIsImFkbWluL3ZpZXdFdmVudEd1ZXN0cy5kaXIuanMiLCJjb3JlL0V2ZW50LmZhY3RvcnkuanMiLCJjb3JlL0ZpcmUuZmFjdG9yeS5qcyIsImNvcmUvTVEuY29uc3RhbnQuanMiLCJjb3JlL09BVVRILmNvbnN0YW50LmpzIiwiY29yZS9VdGlscy5mYWN0b3J5LmpzIiwiY29yZS9hcHAuYXV0aC5qcyIsImNvcmUvYXBwLmNvbmZpZy5qcyIsImNvcmUvZGV0ZWN0QWRCbG9jay5kaXIuanMiLCJjb3JlL2V2ZW50RGF0YS5zZXJ2aWNlLmpzIiwiY29yZS9sb2NhbERhdGEuc2VydmljZS5qcyIsImNvcmUvbWVkaWFDaGVjay5zZXJ2aWNlLmpzIiwiY29yZS9yc3ZwRGF0YS5zZXJ2aWNlLmpzIiwiY29yZS90cnVzdEFzSFRNTC5maWx0ZXIuanMiLCJjb3JlL3ZpZXdTd2l0Y2guZGlyLmpzIiwiZXZlbnQtZGV0YWlsL0V2ZW50RGV0YWlsLmN0cmwuanMiLCJldmVudC1kZXRhaWwvcnN2cEZvcm0uZGlyLmpzIiwiZXZlbnRzL0V2ZW50cy5jdHJsLmpzIiwiZXZlbnRzL3ByZXR0eURhdGUuZmlsdGVyLmpzIiwiaGVhZGVyL0hlYWRlci5jdHJsLmpzIiwiaGVhZGVyL25hdkNvbnRyb2wuZGlyLmpzIiwibG9naW4vTG9naW4uY3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJuZy1hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyXG5cdC5tb2R1bGUoJ215QXBwJywgWydmaXJlYmFzZScsICduZ1JvdXRlJywgJ25nUmVzb3VyY2UnLCAnbmdTYW5pdGl6ZScsICduZ01lc3NhZ2VzJywgJ21lZGlhQ2hlY2snLCAndWkuYm9vdHN0cmFwJ10pOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FjY291bnRDdHJsJywgQWNjb3VudEN0cmwpO1xuXG5cdEFjY291bnRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nLCAnRmlyZScsICdVdGlscycsICdPQVVUSCcsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIEFjY291bnRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBGaXJlLCBVdGlscywgT0FVVEgsICR0aW1lb3V0KSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhY2NvdW50ID0gdGhpcztcblxuXHRcdC8vIFRPRE86IHNob3cgdXNlcidzIGdlbmVyYWwgaW5mb3JtYXRpb25cblx0XHQvLyBUT0RPOiBzaG93IHVzZXIncyBSU1ZQc1xuXHRcdC8vIFRPRE86IHJlbW92ZSB0YWJzIChub3QgbmVjZXNzYXJ5KVxuXG5cdFx0YWNjb3VudC5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvLyBnZXQgdXNlciBzeW5jaHJvbm91c2x5IGFuZCBncmFiIG5lY2Vzc2FyeSBkYXRhIHRvIGRpc3BsYXlcblx0XHRhY2NvdW50LnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cdFx0YWNjb3VudC5sb2dpbnMgPSBPQVVUSC5MT0dJTlM7XG5cblx0XHR2YXIgX3Byb3ZpZGVyID0gYWNjb3VudC51c2VyLnByb3ZpZGVyO1xuXHRcdHZhciBfcHJvZmlsZSA9IGFjY291bnQudXNlcltfcHJvdmlkZXJdLmNhY2hlZFVzZXJQcm9maWxlO1xuXG5cdFx0YWNjb3VudC51c2VyTmFtZSA9IGFjY291bnQudXNlcltfcHJvdmlkZXJdLmRpc3BsYXlOYW1lO1xuXHRcdGFjY291bnQudXNlclBpY3R1cmUgPSBVdGlscy5nZXRVc2VyUGljdHVyZShhY2NvdW50LnVzZXIpO1xuXG5cdFx0dmFyIHJzdnBEYXRhID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0ZnVuY3Rpb24gX2dldE15UnN2cHMoZGF0YSkge1xuXHRcdFx0YWNjb3VudC5yc3ZwcyA9IFtdO1xuXG5cdFx0XHR2YXIgX2FsbFJzdnBzID0gZGF0YTtcblxuXHRcdFx0Zm9yICh2YXIgbiA9IDA7IG4gPCBfYWxsUnN2cHMubGVuZ3RoOyBuKyspIHtcblx0XHRcdFx0dmFyIF90aGlzID0gX2FsbFJzdnBzW25dO1xuXG5cdFx0XHRcdGlmIChfdGhpcy51c2VySWQgPT09IGFjY291bnQudXNlci51aWQpIHtcblx0XHRcdFx0XHRhY2NvdW50LnJzdnBzLnB1c2goX3RoaXMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGFjY291bnQucnN2cHNSZWFkeSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cnN2cERhdGEuJGxvYWRlZCgpLnRoZW4oX2dldE15UnN2cHMpO1xuXG5cdFx0dmFyIF90YWIgPSAkbG9jYXRpb24uc2VhcmNoKCkudmlldztcblxuXHRcdGFjY291bnQudGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1VzZXIgSW5mbycsXG5cdFx0XHRcdHF1ZXJ5OiAndXNlci1pbmZvJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1JTVlBzJyxcblx0XHRcdFx0cXVlcnk6ICdyc3Zwcydcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0YWNjb3VudC5jdXJyZW50VGFiID0gX3RhYiA/IF90YWIgOiAndXNlci1pbmZvJztcblxuXHRcdC8qKlxuXHRcdCAqIENoYW5nZSB0YWJzIGJ5IHdhdGNoaW5nIGZvciByb3V0ZSB1cGRhdGVcblx0XHQgKi9cblx0XHQkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgbmV4dCkge1xuXHRcdFx0YWNjb3VudC5jdXJyZW50VGFiID0gbmV4dC5wYXJhbXMudmlldyB8fCAndXNlci1pbmZvJztcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCB1c2VyJ3MgcHJvZmlsZSBpbmZvcm1hdGlvblxuXHRcdCAqL1xuXHRcdGFjY291bnQuZ2V0UHJvZmlsZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIHVzZXIncyBwcm9maWxlIGRhdGFcblx0XHRcdCAqIFNob3cgQWNjb3VudCBVSVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldFVzZXJTdWNjZXNzKGRhdGEpIHtcblx0XHRcdFx0YWNjb3VudC51c2VyID0gZGF0YTtcblx0XHRcdFx0YWNjb3VudC5hZG1pbmlzdHJhdG9yID0gYWNjb3VudC51c2VyLmlzQWRtaW47XG5cdFx0XHRcdGFjY291bnQubGlua2VkQWNjb3VudHMgPSBVc2VyLmdldExpbmtlZEFjY291bnRzKGFjY291bnQudXNlciwgJ2FjY291bnQnKTtcblx0XHRcdFx0YWNjb3VudC5zaG93QWNjb3VudCA9IHRydWU7XG5cdFx0XHRcdGFjY291bnQucnN2cHMgPSBhY2NvdW50LnVzZXIucnN2cHM7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGVycm9yIEFQSSBjYWxsIGdldHRpbmcgdXNlcidzIHByb2ZpbGUgZGF0YVxuXHRcdFx0ICogU2hvdyBhbiBlcnJvciBhbGVydCBpbiB0aGUgVUlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gZXJyb3Jcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9nZXRVc2VyRXJyb3IoZXJyb3IpIHtcblx0XHRcdFx0YWNjb3VudC5lcnJvckdldHRpbmdVc2VyID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0dXNlckRhdGEuZ2V0VXNlcigpLnRoZW4oX2dldFVzZXJTdWNjZXNzLCBfZ2V0VXNlckVycm9yKTtcblx0XHR9O1xuXG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignQWRtaW5DdHJsJywgQWRtaW5DdHJsKTtcblxuXHRBZG1pbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdGaXJlJ107XG5cblx0ZnVuY3Rpb24gQWRtaW5DdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBGaXJlKSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhZG1pbiA9IHRoaXM7XG5cblx0XHRhZG1pbi51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2Vcblx0XHRhZG1pbi5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHR2YXIgX3RhYiA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuXG5cdFx0YWRtaW4udGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ0V2ZW50cycsXG5cdFx0XHRcdHF1ZXJ5OiAnZXZlbnRzJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ0FkZCBFdmVudCcsXG5cdFx0XHRcdHF1ZXJ5OiAnYWRkLWV2ZW50J1xuXHRcdFx0fVxuXHRcdF07XG5cblx0XHRhZG1pbi5jdXJyZW50VGFiID0gX3RhYiA/IF90YWIgOiAnZXZlbnRzJztcblxuXHRcdC8qKlxuXHRcdCAqIENoYW5nZSB0YWJzIGJ5IHdhdGNoaW5nIGZvciByb3V0ZSB1cGRhdGVcblx0XHQgKi9cblx0XHQkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgbmV4dCkge1xuXHRcdFx0YWRtaW4uY3VycmVudFRhYiA9IG5leHQucGFyYW1zLnZpZXcgfHwgJ2V2ZW50cyc7XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBTaG93IFJTVlBlZCBndWVzdCBtb2RhbFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50SWQge3N0cmluZ30gZXZlbnQgSUQgdG8gZ2V0IFJTVlBzIGZvclxuXHRcdCAqIEBwYXJhbSBldmVudE5hbWUge3N0cmluZ30gZXZlbnQgbmFtZSB0byBnZXQgUlNWUHMgZm9yXG5cdFx0ICovXG5cdFx0YWRtaW4uc2hvd0d1ZXN0cyA9IGZ1bmN0aW9uKGV2ZW50SWQsIGV2ZW50TmFtZSkge1xuXHRcdFx0YWRtaW4uc2hvd0d1ZXN0c0V2ZW50SWQgPSBldmVudElkO1xuXHRcdFx0YWRtaW4uc2hvd0d1ZXN0c0V2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHRcdGFkbWluLnNob3dNb2RhbCA9IHRydWU7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdBZG1pbkV2ZW50TGlzdEN0cmwnLCBBZG1pbkV2ZW50TGlzdEN0cmwpO1xuXG5cdEFkbWluRXZlbnRMaXN0Q3RybC4kaW5qZWN0ID0gWydGaXJlJywgJyRsb2NhdGlvbicsICckdGltZW91dCcsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIEFkbWluRXZlbnRMaXN0Q3RybChGaXJlLCAkbG9jYXRpb24sICR0aW1lb3V0LCBFdmVudCkge1xuXHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHR2YXIgYUV2dCA9IHRoaXM7XG5cblx0XHRhRXZ0LmV2dFVybCA9ICRsb2NhdGlvbi5wcm90b2NvbCgpICsgJzovLycgKyAkbG9jYXRpb24uaG9zdCgpICsgJy9ldmVudC8nO1xuXG5cdFx0LyoqXG5cdFx0ICogSGlkZSBVUkwgaW5wdXQgZmllbGQgd2hlbiBibHVycmVkXG5cdFx0ICovXG5cdFx0YUV2dC5ibHVyVXJsSW5wdXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFFdnQuY29weUlucHV0ID0gbnVsbDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU2hvdyBVUkwgaW5wdXQgZmllbGQgd2hlbiBJRCBsaW5rIGlzIGNsaWNrZWRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpbmRleFxuXHRcdCAqL1xuXHRcdGFFdnQuc2hvd1VybElucHV0ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGFFdnQuY29weUlucHV0ID0gaW5kZXg7XG5cblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoJyNlJyArIGluZGV4KS5maW5kKCdpbnB1dCcpLnNlbGVjdCgpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8vIGdldCBldmVudHMgZnJvbSBGaXJlYmFzZVxuXHRcdGFFdnQuZXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRhRXZ0LnNvcnRTdGFydERhdGUgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdHJldHVybiBFdmVudC5nZXRKU0RhdGV0aW1lKGV2dC5zdGFydERhdGUsIGV2dC5zdGFydFRpbWUpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignRWRpdEV2ZW50Q3RybCcsIEVkaXRFdmVudEN0cmwpO1xuXG5cdEVkaXRFdmVudEN0cmwuJGluamVjdCA9IFsnRmlyZScsICckcm91dGVQYXJhbXMnLCAnJGxvY2F0aW9uJywgJyR0aW1lb3V0J107XG5cblx0ZnVuY3Rpb24gRWRpdEV2ZW50Q3RybChGaXJlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHRpbWVvdXQpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGVkaXQgPSB0aGlzO1xuXG5cdFx0Ly8gZ2V0IHRoZSBldmVudCBJRFxuXHRcdHZhciBfZXZlbnRJZCA9ICRyb3V0ZVBhcmFtcy5ldmVudElkO1xuXG5cdFx0Ly8gZ2V0IGV2ZW50c1xuXHRcdHZhciBldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0Ly8gdGFic1xuXHRcdGVkaXQudGFicyA9IFsnVXBkYXRlIERldGFpbHMnLCAnRGVsZXRlIEV2ZW50J107XG5cdFx0ZWRpdC5jdXJyZW50VGFiID0gMDtcblxuXHRcdC8qKlxuXHRcdCAqIFN3aXRjaCB0YWJzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gaW5kZXgge251bWJlcn0gdGFiIGluZGV4XG5cdFx0ICovXG5cdFx0ZWRpdC5jaGFuZ2VUYWIgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0ZWRpdC5jdXJyZW50VGFiID0gaW5kZXg7XG5cdFx0fTtcblxuXHRcdC8vIHN5bmNocm9ub3VzbHkgcmV0cmlldmUgdXNlciBkYXRhXG5cdFx0ZWRpdC51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2Vcblx0XHRlZGl0LmRhdGEgPSBGaXJlLmRhdGEoKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgc2luZ2xlIGV2ZW50IGRldGFpbFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gZXZlbnRzIGRhdGFcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0ZWRpdC5lZGl0RXZlbnQgPSBldmVudHMuJGdldFJlY29yZChfZXZlbnRJZCk7XG5cdFx0XHRlZGl0LnNob3dFZGl0Rm9ybSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZXZlbnRzLiRsb2FkZWQoX2V2ZW50U3VjY2Vzcyk7XG5cblx0XHQvKipcblx0XHQgKiBSZXNldCB0aGUgZGVsZXRlIGJ1dHRvbiB0byBkZWZhdWx0IHN0YXRlXG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9idG5EZWxldGVSZXNldCgpIHtcblx0XHRcdGVkaXQuYnRuRGVsZXRlID0gZmFsc2U7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRGVsZXRlIEV2ZW50Jztcblx0XHR9XG5cblx0XHRfYnRuRGVsZXRlUmVzZXQoKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIHJldHVybmVkIG9uIHN1Y2Nlc3NmdWwgZGVsZXRpb24gb2YgZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2RlbGV0ZVN1Y2Nlc3MoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRGVsZXRlZCEnO1xuXHRcdFx0ZWRpdC5idG5EZWxldGUgPSB0cnVlO1xuXHRcdFx0ZWRpdC5lZGl0RXZlbnQgPSB7fTtcblxuXHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvYWRtaW4nKTtcblx0XHRcdH0sIDE1MDApO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIHJldHVybmVkIG9uIGVycm9yIGRlbGV0aW5nIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9kZWxldGVFcnJvcigpIHtcblx0XHRcdGVkaXQuYnRuRGVsZXRlVGV4dCA9ICdFcnJvciBkZWxldGluZyEnO1xuXG5cdFx0XHQkdGltZW91dChfYnRuRGVsZXRlUmVzZXQsIDMwMDApO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZSB0aGUgZXZlbnRcblx0XHQgKi9cblx0XHRlZGl0LmRlbGV0ZUV2ZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcnN2cHMgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdGVkaXQuYnRuRGVsZXRlVGV4dCA9ICdEZWxldGluZy4uLic7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRGVsZXRlIGFsbCBSU1ZQcyBhc3NvY2lhdGVkIHdpdGggdGhlIGRlbGV0ZWQgZXZlbnRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZGVsZXRlUnN2cHMoKSB7XG5cdFx0XHRcdGFuZ3VsYXIuZm9yRWFjaChyc3ZwcywgZnVuY3Rpb24ocnN2cCkge1xuXHRcdFx0XHRcdGlmIChyc3ZwLmV2ZW50SWQgPT09IGVkaXQuZWRpdEV2ZW50LiRpZCkge1xuXHRcdFx0XHRcdFx0cnN2cHMuJHJlbW92ZShyc3ZwKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0cnN2cHMuJGxvYWRlZCgpLnRoZW4oX2RlbGV0ZVJzdnBzKTtcblxuXHRcdFx0Ly8gZGVsZXRlIHRoZSBldmVudFxuXHRcdFx0ZXZlbnRzLiRyZW1vdmUoZWRpdC5lZGl0RXZlbnQpLnRoZW4oX2RlbGV0ZVN1Y2Nlc3MsIF9kZWxldGVFcnJvcik7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ2V2ZW50Rm9ybScsIGV2ZW50Rm9ybSk7XG5cblx0ZXZlbnRGb3JtLiRpbmplY3QgPSBbJ0ZpcmUnLCAnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRmaWx0ZXInLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBldmVudEZvcm0oRmlyZSwgJHRpbWVvdXQsICRsb2NhdGlvbiwgJGZpbHRlciwgRXZlbnQpIHtcblxuXHRcdGV2ZW50Rm9ybUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHRmdW5jdGlvbiBldmVudEZvcm1DdHJsKCRzY29wZSkge1xuXHRcdFx0Ly8gY29udHJvbGxlckFzIHN5bnRheFxuXHRcdFx0dmFyIGVmID0gdGhpcztcblxuXHRcdFx0Ly8gY2hlY2sgaWYgZm9ybSBpcyBjcmVhdGUgb3IgZWRpdFxuXHRcdFx0dmFyIF9pc0NyZWF0ZSA9ICEhZWYucHJlZmlsbE1vZGVsSWQgPT09IGZhbHNlO1xuXHRcdFx0dmFyIF9pc0VkaXQgPSAhIWVmLnByZWZpbGxNb2RlbElkID09PSB0cnVlO1xuXG5cdFx0XHR2YXIgZXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdFx0ZWYudGltZVJlZ2V4ID0gL14oMD9bMS05XXwxWzAxMl0pKDpbMC01XVxcZCkgW0FQYXBdW21NXSQvaTtcblxuXHRcdFx0aWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0ZXZlbnRzLiRsb2FkZWQoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRlZi5mb3JtTW9kZWwgPSBldmVudHMuJGdldFJlY29yZChlZi5wcmVmaWxsTW9kZWxJZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBwcmV2ZW50IHNlbGVjdGluZyBkYXRlcyBpbiB0aGUgcGFzdFxuXHRcdFx0ZWYubWluRGF0ZSA9IG5ldyBEYXRlKCk7XG5cblx0XHRcdGVmLmRhdGVPcHRpb25zID0ge1xuXHRcdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0XHR9O1xuXG5cdFx0XHRlZi5zdGFydERhdGVPcGVuID0gZmFsc2U7XG5cdFx0XHRlZi5lbmREYXRlT3BlbiA9IGZhbHNlO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFRvZ2dsZSB0aGUgZGF0ZXBpY2tlciBvcGVuL2Nsb3NlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSAkZXZlbnQge29iamVjdH1cblx0XHRcdCAqIEBwYXJhbSBkYXRlTmFtZSB7c3RyaW5nfSBzdGFydERhdGUgLyBlbmREYXRlXG5cdFx0XHQgKi9cblx0XHRcdGVmLnRvZ2dsZURhdGVwaWNrZXIgPSBmdW5jdGlvbigkZXZlbnQsIGRhdGVOYW1lKSB7XG5cdFx0XHRcdCRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHRcdFx0ZWZbZGF0ZU5hbWUgKyAnT3BlbiddID0gIWVmW2RhdGVOYW1lICsgJ09wZW4nXTtcblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVHJhbnNmb3JtIGRhdGVzIHRvIGEgZm9ybWF0IEFuZ3VsYXJGaXJlIHdpbGwgc2F2ZSB0byBGaXJlYmFzZVxuXHRcdFx0ICogQW5ndWxhckZpcmUgd29udGZpeCBidWc6IGh0dHBzOi8vZ2l0aHViLmNvbS9maXJlYmFzZS9hbmd1bGFyZmlyZS9pc3N1ZXMvMzgxXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybiB7c3RyaW5nfSBtbS9kZC95eXl5XG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9mb3JtYXREYXRlKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuICRmaWx0ZXIoJ2RhdGUnKShkYXRlLCAnTU0vZGQveXl5eScpO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIE9uIHN0YXJ0IGRhdGUgdmFsaWQgYmx1ciwgdXBkYXRlIGVuZCBkYXRlIGlmIGVtcHR5XG5cdFx0XHQgKi9cblx0XHRcdGVmLnN0YXJ0RGF0ZUJsdXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKGVmLmZvcm1Nb2RlbCAmJiBlZi5mb3JtTW9kZWwuc3RhcnREYXRlICYmICFlZi5mb3JtTW9kZWwuZW5kRGF0ZSkge1xuXHRcdFx0XHRcdGVmLmZvcm1Nb2RlbC5lbmREYXRlID0gX2Zvcm1hdERhdGUoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmVzZXQgdGhlIHN0YXRlIG9mIHRoZSBmb3JtIFN1Ym1pdCBidXR0b25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYnRuU3VibWl0UmVzZXQoKSB7XG5cdFx0XHRcdGVmLmJ0blNhdmVkID0gZmFsc2U7XG5cdFx0XHRcdGVmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU3VibWl0JyA6ICdVcGRhdGUnO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEdvIHRvIEV2ZW50cyB0YWJcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZ29Ub0V2ZW50cygpIHtcblx0XHRcdFx0JGxvY2F0aW9uLnNlYXJjaCgndmlldycsICdldmVudHMnKTtcblx0XHRcdH1cblxuXHRcdFx0X2J0blN1Ym1pdFJlc2V0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGV2ZW50IEFQSSBjYWxsIHN1Y2NlZWRlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MocmVmKSB7XG5cdFx0XHRcdGVmLmJ0blNhdmVkID0gdHJ1ZTtcblx0XHRcdFx0ZWYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTYXZlZCEnIDogJ1VwZGF0ZWQhJztcblxuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0ZWYuc2hvd1JlZGlyZWN0TXNnID0gdHJ1ZTtcblx0XHRcdFx0XHQkdGltZW91dChfZ29Ub0V2ZW50cywgMjUwMCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRcdGVmLnNob3dVcGRhdGVEZXRhaWxMaW5rID0gdHJ1ZTtcblx0XHRcdFx0XHQkdGltZW91dChfYnRuU3VibWl0UmVzZXQsIDI1MDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGV2ZW50IEFQSSBjYWxsIGVycm9yXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2V2ZW50RXJyb3IoZXJyKSB7XG5cdFx0XHRcdGVmLmJ0blNhdmVkID0gJ2Vycm9yJztcblx0XHRcdFx0ZWYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdFcnJvciBzYXZpbmchJyA6ICdFcnJvciB1cGRhdGluZyEnO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKGVmLmJ0blN1Ym1pdFRleHQsIGVycik7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayBpZiBldmVudCBzdGFydCBhbmQgZW5kIGRhdGV0aW1lcyBhcmUgYSB2YWxpZCByYW5nZVxuXHRcdFx0ICogUnVucyBvbiBibHVyIG9mIGV2ZW50IGRhdGVzL3RpbWVzXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0XHQgKi9cblx0XHRcdGVmLnZhbGlkYXRlRGF0ZXJhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChlZi5mb3JtTW9kZWwgJiYgZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSAmJiBlZi5mb3JtTW9kZWwuc3RhcnRUaW1lICYmIGVmLmZvcm1Nb2RlbC5lbmREYXRlICYmIGVmLmZvcm1Nb2RlbC5lbmRUaW1lKSB7XG5cdFx0XHRcdFx0dmFyIHN0YXJ0RGF0ZXRpbWUgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGVmLmZvcm1Nb2RlbC5zdGFydERhdGUsIGVmLmZvcm1Nb2RlbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRcdFx0ZW5kRGF0ZXRpbWUgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGVmLmZvcm1Nb2RlbC5lbmREYXRlLCBlZi5mb3JtTW9kZWwuZW5kVGltZSk7XG5cblx0XHRcdFx0XHRlZi52YWxpZERhdGVyYW5nZSA9IChzdGFydERhdGV0aW1lIC0gZW5kRGF0ZXRpbWUpIDwgMDtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBzdWJtaXQgYnV0dG9uXG5cdFx0XHQgKiBTdWJtaXQgbmV3IGV2ZW50IHRvIEFQSVxuXHRcdFx0ICogRm9ybSBAIGV2ZW50Rm9ybS50cGwuaHRtbFxuXHRcdFx0ICovXG5cdFx0XHRlZi5zdWJtaXRFdmVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRlZi5mb3JtTW9kZWwuc3RhcnREYXRlID0gX2Zvcm1hdERhdGUoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSk7XG5cdFx0XHRcdGVmLmZvcm1Nb2RlbC5lbmREYXRlID0gX2Zvcm1hdERhdGUoZWYuZm9ybU1vZGVsLmVuZERhdGUpO1xuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBVcGRhdGUgUlNWUHMgYXR0YWNoZWQgdG8gdGhpcyBldmVudFxuXHRcdFx0XHQgKlxuXHRcdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0XHQgKi9cblx0XHRcdFx0ZnVuY3Rpb24gX3VwZGF0ZVJzdnBzKCkge1xuXHRcdFx0XHRcdGFuZ3VsYXIuZm9yRWFjaChyc3ZwcywgZnVuY3Rpb24ocnN2cCkge1xuXHRcdFx0XHRcdFx0aWYgKHJzdnAuZXZlbnRJZCA9PT0gZWYuZm9ybU1vZGVsLiRpZCAmJiByc3ZwLmV2ZW50TmFtZSAhPT0gZWYuZm9ybU1vZGVsLnRpdGxlKSB7XG5cdFx0XHRcdFx0XHRcdHJzdnAuZXZlbnROYW1lID0gZWYuZm9ybU1vZGVsLnRpdGxlO1xuXHRcdFx0XHRcdFx0XHRyc3Zwcy4kc2F2ZShyc3ZwKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0XHRldmVudHMuJGFkZChlZi5mb3JtTW9kZWwpLnRoZW4oX2V2ZW50U3VjY2VzcywgX2V2ZW50RXJyb3IpO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRcdHZhciByc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0XHRcdHJzdnBzLiRsb2FkZWQoKS50aGVuKF91cGRhdGVSc3Zwcyk7XG5cdFx0XHRcdFx0ZXZlbnRzLiRzYXZlKGVmLmZvcm1Nb2RlbCkudGhlbihfZXZlbnRTdWNjZXNzLCBfZXZlbnRFcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0cHJlZmlsbE1vZGVsSWQ6ICdAJ1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnL25nLWFwcC9hZG1pbi9ldmVudEZvcm0udHBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogZXZlbnRGb3JtQ3RybCxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2VmJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCd2YWxpZGF0ZURhdGVGdXR1cmUnLCB2YWxpZGF0ZURhdGVGdXR1cmUpO1xuXG5cdHZhbGlkYXRlRGF0ZUZ1dHVyZS4kaW5qZWN0ID0gWydldmVudERhdGEnLCAnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRmaWx0ZXInLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiB2YWxpZGF0ZURhdGVGdXR1cmUoKSB7XG5cblx0XHR2YWxpZGF0ZURhdGVGdXR1cmVMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbScsICckYXR0cnMnLCAnbmdNb2RlbCddO1xuXG5cdFx0ZnVuY3Rpb24gdmFsaWRhdGVEYXRlRnV0dXJlTGluaygkc2NvcGUsICRlbGVtLCAkYXR0cnMsIG5nTW9kZWwpIHtcblx0XHRcdHZhciBfbm93ID0gbmV3IERhdGUoKSxcblx0XHRcdFx0X3llc3RlcmRheSA9IF9ub3cuc2V0RGF0ZShfbm93LmdldERhdGUoKSAtIDEpO1xuXG5cdFx0XHRuZ01vZGVsLiRwYXJzZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIF9kID0gRGF0ZS5wYXJzZSh2YWx1ZSksXG5cdFx0XHRcdFx0X3ZhbGlkID0gX3llc3RlcmRheSAtIF9kIDwgMDtcblxuXHRcdFx0XHRuZ01vZGVsLiRzZXRWYWxpZGl0eSgncGFzdERhdGUnLCBfdmFsaWQpO1xuXG5cdFx0XHRcdHJldHVybiBfdmFsaWQgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcblx0XHRcdH0pO1xuXG5cdFx0XHRuZ01vZGVsLiRmb3JtYXR0ZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIF9kID0gRGF0ZS5wYXJzZSh2YWx1ZSksXG5cdFx0XHRcdFx0X3ZhbGlkID0gX3llc3RlcmRheSAtIF9kIDwgMDtcblxuXHRcdFx0XHRuZ01vZGVsLiRzZXRWYWxpZGl0eSgncGFzdERhdGUnLCBfdmFsaWQpO1xuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IHZhbGlkYXRlRGF0ZUZ1dHVyZUxpbmtcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCd2aWV3RXZlbnRHdWVzdHMnLCB2aWV3RXZlbnRHdWVzdHMpO1xuXG5cdHZpZXdFdmVudEd1ZXN0cy4kaW5qZWN0ID0gWydGaXJlJ107XG5cblx0ZnVuY3Rpb24gdmlld0V2ZW50R3Vlc3RzKEZpcmUpIHtcblxuXHRcdHZpZXdFdmVudEd1ZXN0c0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHRmdW5jdGlvbiB2aWV3RXZlbnRHdWVzdHNDdHJsKCRzY29wZSkge1xuXHRcdFx0Ly8gY29udHJvbGxlckFzIHN5bnRheFxuXHRcdFx0dmFyIGcgPSB0aGlzO1xuXG5cdFx0XHR2YXIgcnN2cERhdGEgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwRGF0YUxvYWRlZChkYXRhKSB7XG5cdFx0XHRcdHZhciBfYWxsUnN2cHMgPSBkYXRhO1xuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZXQgdXAgZ3Vlc3RsaXN0IGZvciB2aWV3XG5cdFx0XHRcdCAqIFNldCB1cCBndWVzdCBjb3VudHMgZm9yIHZpZXdcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogQHBhcmFtIGV2ZW50R3Vlc3RzIHtBcnJheX0gZ3Vlc3RzIHdobyBoYXZlIFJTVlBlZCB0byBzcGVjaWZpYyBldmVudFxuXHRcdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0XHQgKi9cblx0XHRcdFx0ZnVuY3Rpb24gX3Nob3dFdmVudEd1ZXN0cyhldmVudEd1ZXN0cykge1xuXHRcdFx0XHRcdHZhciBfdG90YWxHdWVzdHMgPSAwO1xuXG5cdFx0XHRcdFx0Zy5ndWVzdHMgPSBldmVudEd1ZXN0cztcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZy5ndWVzdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciBfdGhpc0d1ZXN0ID0gZy5ndWVzdHNbaV07XG5cblx0XHRcdFx0XHRcdGlmIChfdGhpc0d1ZXN0LmF0dGVuZGluZykge1xuXHRcdFx0XHRcdFx0XHRfdG90YWxHdWVzdHMgKz0gX3RoaXNHdWVzdC5ndWVzdHM7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Zy50b3RhbEd1ZXN0cyA9IF90b3RhbEd1ZXN0cztcblx0XHRcdFx0XHRnLmd1ZXN0c1JlYWR5ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiAkd2F0Y2ggZXZlbnQgSUQgYW5kIGNvbGxlY3QgdXBkYXRlZCBzZXRzIG9mIGd1ZXN0c1xuXHRcdFx0XHQgKi9cblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgnZy5ldmVudElkJywgZnVuY3Rpb24gKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRcdFx0aWYgKG5ld1ZhbCkge1xuXHRcdFx0XHRcdFx0dmFyIF9ldmVudEd1ZXN0cyA9IFtdO1xuXHRcdFx0XHRcdFx0Zy5ndWVzdHNSZWFkeSA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBuID0gMDsgbiA8IF9hbGxSc3Zwcy5sZW5ndGg7IG4rKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgX3RoaXNHdWVzdCA9IF9hbGxSc3Zwc1tuXTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoX3RoaXNHdWVzdC5ldmVudElkID09PSBnLmV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdFx0XHRfZXZlbnRHdWVzdHMucHVzaChfdGhpc0d1ZXN0KTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRfc2hvd0V2ZW50R3Vlc3RzKF9ldmVudEd1ZXN0cyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0cnN2cERhdGEuJGxvYWRlZCgpLnRoZW4oX3JzdnBEYXRhTG9hZGVkKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbG9zZSB0aGlzIG1vZGFsIGRpcmVjdGl2ZVxuXHRcdFx0ICovXG5cdFx0XHRnLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Zy5zaG93TW9kYWwgPSBmYWxzZTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZXZlbnRJZDogJz0nLFxuXHRcdFx0XHRldmVudE5hbWU6ICc9Jyxcblx0XHRcdFx0c2hvd01vZGFsOiAnPSdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJy9uZy1hcHAvYWRtaW4vdmlld0V2ZW50R3Vlc3RzLnRwbC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6IHZpZXdFdmVudEd1ZXN0c0N0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdnJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9XG5cdH1cbn0pKCk7IiwiLy8gRXZlbnQgZnVuY3Rpb25zXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5mYWN0b3J5KCdFdmVudCcsIEV2ZW50KTtcblxuXHRFdmVudC4kaW5qZWN0ID0gWydVdGlscycsICckZmlsdGVyJ107XG5cblx0ZnVuY3Rpb24gRXZlbnQoVXRpbHMsICRmaWx0ZXIpIHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIHByZXR0eSBkYXRlIGZvciBVSSBkaXNwbGF5IGZyb20gdGhlIHN0YXJ0IGFuZCBlbmQgZGF0ZXRpbWVzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRPYmoge29iamVjdH0gdGhlIGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IHByZXR0eSBzdGFydCBhbmQgZW5kIGRhdGUgLyB0aW1lIHN0cmluZ1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldFByZXR0eURhdGV0aW1lKGV2ZW50T2JqKSB7XG5cdFx0XHR2YXIgc3RhcnREYXRlID0gZXZlbnRPYmouc3RhcnREYXRlLFxuXHRcdFx0XHRzdGFydEQgPSBuZXcgRGF0ZShzdGFydERhdGUpLFxuXHRcdFx0XHRzdGFydFRpbWUgPSBldmVudE9iai5zdGFydFRpbWUsXG5cdFx0XHRcdGVuZERhdGUgPSBldmVudE9iai5lbmREYXRlLFxuXHRcdFx0XHRlbmREID0gbmV3IERhdGUoZW5kRGF0ZSksXG5cdFx0XHRcdGVuZFRpbWUgPSBldmVudE9iai5lbmRUaW1lLFxuXHRcdFx0XHRkYXRlRm9ybWF0U3RyID0gJ01NTSBkIHl5eXknLFxuXHRcdFx0XHRwcmV0dHlTdGFydERhdGUgPSAkZmlsdGVyKCdkYXRlJykoc3RhcnRELCBkYXRlRm9ybWF0U3RyKSxcblx0XHRcdFx0cHJldHR5RW5kRGF0ZSA9ICRmaWx0ZXIoJ2RhdGUnKShlbmRELCBkYXRlRm9ybWF0U3RyKSxcblx0XHRcdFx0cHJldHR5RGF0ZXRpbWU7XG5cblx0XHRcdGlmIChwcmV0dHlTdGFydERhdGUgPT09IHByZXR0eUVuZERhdGUpIHtcblx0XHRcdFx0Ly8gZXZlbnQgc3RhcnRzIGFuZCBlbmRzIG9uIHRoZSBzYW1lIGRheVxuXHRcdFx0XHQvLyBBcHIgMjkgMjAxNSwgMTI6MDAgUE0gLSA1OjAwIFBNXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lID0gcHJldHR5U3RhcnREYXRlICsgJywgJyArIHN0YXJ0VGltZSArICcgLSAnICsgZW5kVGltZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIGV2ZW50IHN0YXJ0cyBhbmQgZW5kcyBvbiBkaWZmZXJlbnQgZGF5c1xuXHRcdFx0XHQvLyBEZWMgMzEgMjAxNCwgODowMCBQTSAtIEphbiAxIDIwMTUsIDExOjAwIEFNXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lID0gcHJldHR5U3RhcnREYXRlICsgJywgJyArIHN0YXJ0VGltZSArICcgLSAnICsgcHJldHR5RW5kRGF0ZSArICcsICcgKyBlbmRUaW1lO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcHJldHR5RGF0ZXRpbWU7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogR2V0IEphdmFTY3JpcHQgRGF0ZSBmcm9tIGV2ZW50IGRhdGUgYW5kIHRpbWUgc3RyaW5nc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGVTdHIge3N0cmluZ30gbW0vZGQveXl5XG5cdFx0ICogQHBhcmFtIHRpbWVTdHIge3N0cmluZ30gaGg6bW0gQU0vUE1cblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRKU0RhdGV0aW1lKGRhdGVTdHIsIHRpbWVTdHIpIHtcblx0XHRcdHZhciBkID0gbmV3IERhdGUoZGF0ZVN0ciksXG5cdFx0XHRcdHRpbWVBcnIgPSB0aW1lU3RyLnNwbGl0KCcgJyksXG5cdFx0XHRcdHRpbWUgPSB0aW1lQXJyWzBdLnNwbGl0KCc6JyksXG5cdFx0XHRcdGhvdXJzID0gdGltZVswXSAqIDEsXG5cdFx0XHRcdG1pbnV0ZXMgPSB0aW1lWzFdICogMSxcblx0XHRcdFx0YW1wbSA9IHRpbWVBcnJbMV0sXG5cdFx0XHRcdGZ1bGxkYXRlO1xuXG5cdFx0XHRpZiAoYW1wbSA9PSAnUE0nKSB7XG5cdFx0XHRcdGlmIChob3VycyAhPT0gMTIpIHtcblx0XHRcdFx0XHRob3VycyA9IGhvdXJzICsgMTI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVsbGRhdGUgPSBuZXcgRGF0ZShkLmdldEZ1bGxZZWFyKCksIGQuZ2V0TW9udGgoKSwgZC5nZXREYXRlKCksIGhvdXJzLCBtaW51dGVzKTtcblxuXHRcdFx0cmV0dXJuIGZ1bGxkYXRlO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZSBpZiBldmVudCBpcyBleHBpcmVkXG5cdFx0ICogKGVuZCBkYXRlL3RpbWUgaGFzIHBhc3NlZCBjdXJyZW50IGRhdGUvdGltZSlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldnQge29iamVjdH0gZXZlbnQgb2JqZWN0XG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZXhwaXJlZChldnQpIHtcblx0XHRcdHZhciBqc1N0YXJ0RGF0ZSA9IGdldEpTRGF0ZXRpbWUoZXZ0LmVuZERhdGUsIGV2dC5lbmRUaW1lKSxcblx0XHRcdFx0bm93ID0gbmV3IERhdGUoKTtcblxuXHRcdFx0cmV0dXJuIGpzU3RhcnREYXRlIDwgbm93O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRQcmV0dHlEYXRldGltZTogZ2V0UHJldHR5RGF0ZXRpbWUsXG5cdFx0XHRnZXRKU0RhdGV0aW1lOiBnZXRKU0RhdGV0aW1lLFxuXHRcdFx0ZXhwaXJlZDogZXhwaXJlZFxuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnRmlyZScsIEZpcmUpO1xuXG5cdEZpcmUuJGluamVjdCA9IFsnJGZpcmViYXNlQXV0aCcsICckZmlyZWJhc2VPYmplY3QnLCAnJGZpcmViYXNlQXJyYXknXTtcblxuXHRmdW5jdGlvbiBGaXJlKCRmaXJlYmFzZUF1dGgsICRmaXJlYmFzZU9iamVjdCwgJGZpcmViYXNlQXJyYXkpIHtcblxuXHRcdHZhciB1cmkgPSAnaHR0cHM6Ly9pbnRlbnNlLWhlYXQtNTgyMi5maXJlYmFzZWlvLmNvbS8nO1xuXHRcdHZhciByZWYgPSBuZXcgRmlyZWJhc2UodXJpKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZpcmViYXNlIGF1dGhlbnRpY2F0aW9uIGNvbnRyb2xzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Kn0gQXV0aGVudGljYXRpb25cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBhdXRoKCkge1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZUF1dGgocmVmKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCBGaXJlYmFzZSBkYXRhXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBGaXJlYmFzZSBkYXRhIG9iamVjdFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRhdGEoKSB7XG5cdFx0XHR2YXIgX3JlZiA9IG5ldyBGaXJlYmFzZSh1cmkgKyAnZGF0YScpO1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZU9iamVjdChfcmVmKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCBGaXJlYmFzZSBFdmVudHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtvYmplY3R9IEZpcmViYXNlIGFycmF5XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZXZlbnRzKCkge1xuXHRcdFx0dmFyIF9yZWYgPSBuZXcgRmlyZWJhc2UodXJpICsgJ2V2ZW50cycpO1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZUFycmF5KF9yZWYpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZldGNoIEZpcmViYXNlIFJTVlBzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBGaXJlYmFzZSBhcnJheVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHJzdnBzKCkge1xuXHRcdFx0dmFyIF9yZWYgPSBuZXcgRmlyZWJhc2UodXJpICsgJ3JzdnBzJyk7XG5cdFx0XHRyZXR1cm4gJGZpcmViYXNlQXJyYXkoX3JlZik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHVyaTogdXJpLFxuXHRcdFx0cmVmOiByZWYsXG5cdFx0XHRhdXRoOiBhdXRoLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdGV2ZW50czogZXZlbnRzLFxuXHRcdFx0cnN2cHM6IHJzdnBzXG5cdFx0fVxuXHR9XG59KSgpOyIsIi8vIG1lZGlhIHF1ZXJ5IGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ01RJywge1xuXHRcdFx0U01BTEw6ICcobWF4LXdpZHRoOiA3NjdweCknLFxuXHRcdFx0TEFSR0U6ICcobWluLXdpZHRoOiA3NjhweCknXG5cdFx0fSk7XG59KSgpOyIsIi8vIGxvZ2luL09hdXRoIGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ09BVVRIJywge1xuXHRcdFx0TE9HSU5TOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ29vZ2xlJyxcblx0XHRcdFx0XHRuYW1lOiAnR29vZ2xlJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSdcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGFjY291bnQ6ICd0d2l0dGVyJyxcblx0XHRcdFx0XHRuYW1lOiAnVHdpdHRlcicsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL3R3aXR0ZXIuY29tJ1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0YWNjb3VudDogJ2ZhY2Vib29rJyxcblx0XHRcdFx0XHRuYW1lOiAnRmFjZWJvb2snLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly9mYWNlYm9vay5jb20nXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ2l0aHViJyxcblx0XHRcdFx0XHRuYW1lOiAnR2l0SHViJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vZ2l0aHViLmNvbSdcblx0XHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0pO1xufSkoKTsiLCIvLyBVdGlsaXR5IGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnVXRpbHMnLCBVdGlscyk7XG5cblx0ZnVuY3Rpb24gVXRpbHMoKSB7XG5cdFx0ZnVuY3Rpb24gZ2V0VXNlclBpY3R1cmUodXNlcikge1xuXHRcdFx0dmFyIF9wcm92aWRlciA9IHVzZXIucHJvdmlkZXIsXG5cdFx0XHRcdF9wcm9maWxlID0gdXNlcltfcHJvdmlkZXJdLmNhY2hlZFVzZXJQcm9maWxlO1xuXG5cdFx0XHQvLyBUT0RPOiB0dXJuIHRoaXMgaW50byBhIGhhc2htYXBcblx0XHRcdGlmIChfcHJvdmlkZXIgPT09ICdnaXRodWInKSB7XG5cdFx0XHRcdHJldHVybiBfcHJvZmlsZS5hdmF0YXJfdXJsO1xuXHRcdFx0fSBlbHNlIGlmIChfcHJvdmlkZXIgPT09ICdnb29nbGUnKSB7XG5cdFx0XHRcdHJldHVybiBfcHJvZmlsZS5waWN0dXJlO1xuXHRcdFx0fSBlbHNlIGlmIChfcHJvdmlkZXIgPT09ICd0d2l0dGVyJykge1xuXHRcdFx0XHRyZXR1cm4gX3Byb2ZpbGUucHJvZmlsZV9pbWFnZV91cmw7XG5cdFx0XHR9IGVsc2UgaWYgKF9wcm92aWRlciA9PT0gJ2ZhY2Vib29rJykge1xuXHRcdFx0XHRyZXR1cm4gX3Byb2ZpbGUucGljdHVyZS5kYXRhLnVybDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBHZXQgb3JkaW5hbCB2YWx1ZVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIG4ge251bWJlcn0gaWYgYSBzdHJpbmcgaXMgcHJvdmlkZWQsICUgd2lsbCBhdHRlbXB0IHRvIGNvbnZlcnQgdG8gbnVtYmVyXG5cdFx0ICogQHJldHVybnMge3N0cmluZ30gdGgsIHN0LCBuZCwgcmRcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRPcmRpbmFsKG4pIHtcblx0XHRcdHZhciBvcmRBcnIgPSBbJ3RoJywgJ3N0JywgJ25kJywgJ3JkJ10sXG5cdFx0XHRcdG1vZHVsdXMgPSBuICUgMTAwO1xuXG5cdFx0XHRyZXR1cm4gb3JkQXJyWyhtb2R1bHVzIC0gMjApICUgMTBdIHx8IG9yZEFyclttb2R1bHVzXSB8fCBvcmRBcnJbMF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldFVzZXJQaWN0dXJlOiBnZXRVc2VyUGljdHVyZSxcblx0XHRcdGdldE9yZGluYWw6IGdldE9yZGluYWxcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LnJ1bihhdXRoUnVuKTtcblxuXHRhdXRoUnVuLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJ0ZpcmUnXTtcblxuXHRmdW5jdGlvbiBhdXRoUnVuKCRyb290U2NvcGUsICRsb2NhdGlvbiwgRmlyZSkge1xuXHRcdCRyb290U2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7XG5cdFx0XHR2YXIgX2lzQXV0aGVudGljYXRlZCA9IEZpcmUucmVmLmdldEF1dGgoKTtcblxuXHRcdFx0aWYgKG5leHQgJiYgbmV4dC4kJHJvdXRlICYmIG5leHQuJCRyb3V0ZS5zZWN1cmUgJiYgIV9pc0F1dGhlbnRpY2F0ZWQpIHtcblx0XHRcdFx0JHJvb3RTY29wZS5hdXRoUGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG5cblx0XHRcdFx0JHJvb3RTY29wZS4kZXZhbEFzeW5jKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIHNlbmQgdXNlciB0byBsb2dpblxuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxufSkoKTsiLCIvLyByb3V0ZXNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbmZpZyhhcHBDb25maWcpO1xuXG5cdGFwcENvbmZpZy4kaW5qZWN0ID0gWyckcm91dGVQcm92aWRlcicsICckbG9jYXRpb25Qcm92aWRlciddO1xuXG5cdGZ1bmN0aW9uIGFwcENvbmZpZygkcm91dGVQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblx0XHQkcm91dGVQcm92aWRlclxuXHRcdFx0LndoZW4oJy8nLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2V2ZW50cy9FdmVudHMudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9sb2dpbicsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvbG9naW4vTG9naW4udmlldy5odG1sJ1xuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvZXZlbnQvOmV2ZW50SWQnLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2V2ZW50LWRldGFpbC9FdmVudERldGFpbC52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWVcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2V2ZW50LzpldmVudElkL2VkaXQnLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2FkbWluL0VkaXRFdmVudC52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWVcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2FjY291bnQnLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2FjY291bnQvQWNjb3VudC52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWUsXG5cdFx0XHRcdHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvYWRtaW4nLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2FkbWluL0FkbWluLnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZSxcblx0XHRcdFx0cmVsb2FkT25TZWFyY2g6IGZhbHNlXG5cdFx0XHR9KVxuXHRcdFx0Lm90aGVyd2lzZSh7XG5cdFx0XHRcdHJlZGlyZWN0VG86ICcvJ1xuXHRcdFx0fSk7XG5cblx0XHQkbG9jYXRpb25Qcm92aWRlclxuXHRcdFx0Lmh0bWw1TW9kZSh7XG5cdFx0XHRcdGVuYWJsZWQ6IHRydWVcblx0XHRcdH0pXG5cdFx0XHQuaGFzaFByZWZpeCgnIScpO1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ2RldGVjdEFkYmxvY2snLCBkZXRlY3RBZGJsb2NrKTtcblxuXHRkZXRlY3RBZGJsb2NrLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRsb2NhdGlvbiddO1xuXG5cdGZ1bmN0aW9uIGRldGVjdEFkYmxvY2soJHRpbWVvdXQsICRsb2NhdGlvbikge1xuXG5cdFx0ZGV0ZWN0QWRibG9ja0xpbmsuJGluamVjdCA9IFsnJHNjb3BlJywgJyRlbGVtJywgJyRhdHRycyddO1xuXG5cdFx0ZnVuY3Rpb24gZGV0ZWN0QWRibG9ja0xpbmsoJHNjb3BlLCAkZWxlbSwgJGF0dHJzKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLmFiID0ge307XG5cblx0XHRcdC8vIGhvc3RuYW1lIGZvciBtZXNzYWdpbmdcblx0XHRcdCRzY29wZS5hYi5ob3N0ID0gJGxvY2F0aW9uLmhvc3QoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayBpZiBhZHMgYXJlIGJsb2NrZWQgLSBjYWxsZWQgaW4gJHRpbWVvdXQgdG8gbGV0IEFkQmxvY2tlcnMgcnVuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2FyZUFkc0Jsb2NrZWQoKSB7XG5cdFx0XHRcdHZhciBfYSA9ICRlbGVtLmZpbmQoJy5hZC10ZXN0Jyk7XG5cblx0XHRcdFx0JHNjb3BlLmFiLmJsb2NrZWQgPSBfYS5oZWlnaHQoKSA8PSAwIHx8ICEkZWxlbS5maW5kKCcuYWQtdGVzdDp2aXNpYmxlJykubGVuZ3RoO1xuXHRcdFx0fVxuXG5cdFx0XHQkdGltZW91dChfYXJlQWRzQmxvY2tlZCwgMjAwKTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRsaW5rOiBkZXRlY3RBZGJsb2NrTGluayxcblx0XHRcdHRlbXBsYXRlOiAgICc8ZGl2IGNsYXNzPVwiYWQtdGVzdCBmYS1mYWNlYm9vayBmYS10d2l0dGVyXCIgc3R5bGU9XCJoZWlnaHQ6MXB4O1wiPjwvZGl2PicgK1xuXHRcdFx0XHRcdFx0JzxkaXYgbmctaWY9XCJhYi5ibG9ja2VkXCIgY2xhc3M9XCJhYi1tZXNzYWdlIGFsZXJ0IGFsZXJ0LWRhbmdlclwiPicgK1xuXHRcdFx0XHRcdFx0XHQnPGkgY2xhc3M9XCJmYSBmYS1iYW5cIj48L2k+IDxzdHJvbmc+QWRCbG9jazwvc3Ryb25nPiBpcyBwcm9oaWJpdGluZyBpbXBvcnRhbnQgZnVuY3Rpb25hbGl0eSEgUGxlYXNlIGRpc2FibGUgYWQgYmxvY2tpbmcgb24gPHN0cm9uZz57e2FiLmhvc3R9fTwvc3Ryb25nPi4gVGhpcyBzaXRlIGlzIGFkLWZyZWUuJyArXG5cdFx0XHRcdFx0XHQnPC9kaXY+J1xuXHRcdH1cblx0fVxuXG59KSgpOyIsIi8vIFVzZXIgQVBJICRodHRwIGNhbGxzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5zZXJ2aWNlKCdldmVudERhdGEnLCBldmVudERhdGEpO1xuXG5cdC8qKlxuXHQgKiBHRVQgcHJvbWlzZSByZXNwb25zZSBmdW5jdGlvblxuXHQgKiBDaGVja3MgdHlwZW9mIGRhdGEgcmV0dXJuZWQgYW5kIHN1Y2NlZWRzIGlmIEpTIG9iamVjdCwgdGhyb3dzIGVycm9yIGlmIG5vdFxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ugeyp9IGRhdGEgZnJvbSAkaHR0cFxuXHQgKiBAcmV0dXJucyB7Kn0gb2JqZWN0LCBhcnJheVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gX2dldFJlcyhyZXNwb25zZSkge1xuXHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3JldHJpZXZlZCBkYXRhIGlzIG5vdCB0eXBlb2Ygb2JqZWN0LicpO1xuXHRcdH1cblx0fVxuXG5cdGV2ZW50RGF0YS4kaW5qZWN0ID0gWyckaHR0cCddO1xuXG5cdGZ1bmN0aW9uIGV2ZW50RGF0YSgkaHR0cCkge1xuXHRcdC8qKlxuXHRcdCAqIEdldCBldmVudCBieSBJRFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGlkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRFdmVudCA9IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAoe1xuXHRcdFx0XHRtZXRob2Q6ICdHRVQnLFxuXHRcdFx0XHR1cmw6ICcvYXBpL2V2ZW50LycgKyBpZFxuXHRcdFx0fSkudGhlbihfZ2V0UmVzKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogR2V0IGFsbCBldmVudHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0QWxsRXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmdldCgnL2FwaS9ldmVudHMnKVxuXHRcdFx0XHQudGhlbihfZ2V0UmVzKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIGEgbmV3IGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnREYXRhIHtvYmplY3R9IG5ldyBldmVudCBkYXRhXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50RGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5wb3N0KCcvYXBpL2V2ZW50L25ldycsIGV2ZW50RGF0YSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZSBhbiBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50RGF0YSB7b2JqZWN0fSB1cGRhdGVkIGV2ZW50IGRhdGFcblx0XHQgKiBAcGFyYW0gaWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLnVwZGF0ZUV2ZW50ID0gZnVuY3Rpb24oaWQsIGV2ZW50RGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5wdXQoJy9hcGkvZXZlbnQvJyArIGlkLCBldmVudERhdGEpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBEZWxldGUgYW4gZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpZCB7c3RyaW5nfSBldmVudCBNb25nb0RCIF9pZFxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZGVsZXRlRXZlbnQgPSBmdW5jdGlvbihpZCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5kZWxldGUoJy9hcGkvZXZlbnQvJyArIGlkKTtcblx0XHR9XG5cdH1cbn0pKCk7IiwiLy8gRmV0Y2ggbG9jYWwgSlNPTiBkYXRhXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5zZXJ2aWNlKCdsb2NhbERhdGEnLCBsb2NhbERhdGEpO1xuXG5cdC8qKlxuXHQgKiBHRVQgcHJvbWlzZSByZXNwb25zZSBmdW5jdGlvblxuXHQgKiBDaGVja3MgdHlwZW9mIGRhdGEgcmV0dXJuZWQgYW5kIHN1Y2NlZWRzIGlmIEpTIG9iamVjdCwgdGhyb3dzIGVycm9yIGlmIG5vdFxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ugeyp9IGRhdGEgZnJvbSAkaHR0cFxuXHQgKiBAcmV0dXJucyB7Kn0gb2JqZWN0LCBhcnJheVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gX2dldFJlcyhyZXNwb25zZSkge1xuXHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3JldHJpZXZlZCBkYXRhIGlzIG5vdCB0eXBlb2Ygb2JqZWN0LicpO1xuXHRcdH1cblx0fVxuXG5cdGxvY2FsRGF0YS4kaW5qZWN0ID0gWyckaHR0cCddO1xuXG5cdGZ1bmN0aW9uIGxvY2FsRGF0YSgkaHR0cCkge1xuXHRcdC8qKlxuXHRcdCAqIEdldCBsb2NhbCBKU09OIGRhdGEgZmlsZSBhbmQgcmV0dXJuIHJlc3VsdHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0SlNPTiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9uZy1hcHAvZGF0YS9kYXRhLmpzb24nKVxuXHRcdFx0XHQudGhlbihfZ2V0UmVzKTtcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIGFuZ3VsYXJNZWRpYUNoZWNrID0gYW5ndWxhci5tb2R1bGUoJ21lZGlhQ2hlY2snLCBbXSk7XG5cblx0YW5ndWxhck1lZGlhQ2hlY2suc2VydmljZSgnbWVkaWFDaGVjaycsIFsnJHdpbmRvdycsICckdGltZW91dCcsIGZ1bmN0aW9uICgkd2luZG93LCAkdGltZW91dCkge1xuXHRcdHRoaXMuaW5pdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0XHR2YXIgJHNjb3BlID0gb3B0aW9uc1snc2NvcGUnXSxcblx0XHRcdFx0cXVlcnkgPSBvcHRpb25zWydtcSddLFxuXHRcdFx0XHRkZWJvdW5jZSA9IG9wdGlvbnNbJ2RlYm91bmNlJ10sXG5cdFx0XHRcdCR3aW4gPSBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdyksXG5cdFx0XHRcdGJyZWFrcG9pbnRzLFxuXHRcdFx0XHRjcmVhdGVMaXN0ZW5lciA9IHZvaWQgMCxcblx0XHRcdFx0aGFzTWF0Y2hNZWRpYSA9ICR3aW5kb3cubWF0Y2hNZWRpYSAhPT0gdW5kZWZpbmVkICYmICEhJHdpbmRvdy5tYXRjaE1lZGlhKCchJykuYWRkTGlzdGVuZXIsXG5cdFx0XHRcdG1xTGlzdExpc3RlbmVyLFxuXHRcdFx0XHRtbUxpc3RlbmVyLFxuXHRcdFx0XHRkZWJvdW5jZVJlc2l6ZSxcblx0XHRcdFx0bXEgPSB2b2lkIDAsXG5cdFx0XHRcdG1xQ2hhbmdlID0gdm9pZCAwLFxuXHRcdFx0XHRkZWJvdW5jZVNwZWVkID0gISFkZWJvdW5jZSA/IGRlYm91bmNlIDogMjUwO1xuXG5cdFx0XHRpZiAoaGFzTWF0Y2hNZWRpYSkge1xuXHRcdFx0XHRtcUNoYW5nZSA9IGZ1bmN0aW9uIChtcSkge1xuXHRcdFx0XHRcdGlmIChtcS5tYXRjaGVzICYmIHR5cGVvZiBvcHRpb25zLmVudGVyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRvcHRpb25zLmVudGVyKG1xKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmV4aXQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5leGl0KG1xKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5jaGFuZ2UobXEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjcmVhdGVMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRtcSA9ICR3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSk7XG5cdFx0XHRcdFx0bXFMaXN0TGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbXFDaGFuZ2UobXEpXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdG1xLmFkZExpc3RlbmVyKG1xTGlzdExpc3RlbmVyKTtcblxuXHRcdFx0XHRcdC8vIGJpbmQgdG8gdGhlIG9yaWVudGF0aW9uY2hhbmdlIGV2ZW50IGFuZCBmaXJlIG1xQ2hhbmdlXG5cdFx0XHRcdFx0JHdpbi5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIG1xTGlzdExpc3RlbmVyKTtcblxuXHRcdFx0XHRcdC8vIGNsZWFudXAgbGlzdGVuZXJzIHdoZW4gJHNjb3BlIGlzICRkZXN0cm95ZWRcblx0XHRcdFx0XHQkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdG1xLnJlbW92ZUxpc3RlbmVyKG1xTGlzdExpc3RlbmVyKTtcblx0XHRcdFx0XHRcdCR3aW4udW5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIG1xTGlzdExpc3RlbmVyKTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJldHVybiBtcUNoYW5nZShtcSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0cmV0dXJuIGNyZWF0ZUxpc3RlbmVyKCk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJyZWFrcG9pbnRzID0ge307XG5cblx0XHRcdFx0bXFDaGFuZ2UgPSBmdW5jdGlvbiAobXEpIHtcblx0XHRcdFx0XHRpZiAobXEubWF0Y2hlcykge1xuXHRcdFx0XHRcdFx0aWYgKCEhYnJlYWtwb2ludHNbcXVlcnldID09PSBmYWxzZSAmJiAodHlwZW9mIG9wdGlvbnMuZW50ZXIgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuZW50ZXIobXEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAoYnJlYWtwb2ludHNbcXVlcnldID09PSB0cnVlIHx8IGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5leGl0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5leGl0KG1xKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICgobXEubWF0Y2hlcyAmJiAoIWJyZWFrcG9pbnRzW3F1ZXJ5XSkgfHwgKCFtcS5tYXRjaGVzICYmIChicmVha3BvaW50c1txdWVyeV0gPT09IHRydWUgfHwgYnJlYWtwb2ludHNbcXVlcnldID09IG51bGwpKSkpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5jaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5jaGFuZ2UobXEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBicmVha3BvaW50c1txdWVyeV0gPSBtcS5tYXRjaGVzO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBjb252ZXJ0RW1Ub1B4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdFx0dmFyIGVtRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG5cdFx0XHRcdFx0ZW1FbGVtZW50LnN0eWxlLndpZHRoID0gJzFlbSc7XG5cdFx0XHRcdFx0ZW1FbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVtRWxlbWVudCk7XG5cdFx0XHRcdFx0cHggPSB2YWx1ZSAqIGVtRWxlbWVudC5vZmZzZXRXaWR0aDtcblx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGVtRWxlbWVudCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gcHg7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGdldFBYVmFsdWUgPSBmdW5jdGlvbiAod2lkdGgsIHVuaXQpIHtcblx0XHRcdFx0XHR2YXIgdmFsdWU7XG5cdFx0XHRcdFx0dmFsdWUgPSB2b2lkIDA7XG5cdFx0XHRcdFx0c3dpdGNoICh1bml0KSB7XG5cdFx0XHRcdFx0XHRjYXNlICdlbSc6XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gY29udmVydEVtVG9QeCh3aWR0aCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0dmFsdWUgPSB3aWR0aDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGJyZWFrcG9pbnRzW3F1ZXJ5XSA9IG51bGw7XG5cblx0XHRcdFx0bW1MaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgcGFydHMgPSBxdWVyeS5tYXRjaCgvXFwoKC4qKS0uKjpcXHMqKFtcXGRcXC5dKikoLiopXFwpLyksXG5cdFx0XHRcdFx0XHRjb25zdHJhaW50ID0gcGFydHNbMV0sXG5cdFx0XHRcdFx0XHR2YWx1ZSA9IGdldFBYVmFsdWUocGFyc2VJbnQocGFydHNbMl0sIDEwKSwgcGFydHNbM10pLFxuXHRcdFx0XHRcdFx0ZmFrZU1hdGNoTWVkaWEgPSB7fSxcblx0XHRcdFx0XHRcdHdpbmRvd1dpZHRoID0gJHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aDtcblxuXHRcdFx0XHRcdGZha2VNYXRjaE1lZGlhLm1hdGNoZXMgPSBjb25zdHJhaW50ID09PSAnbWF4JyAmJiB2YWx1ZSA+IHdpbmRvd1dpZHRoIHx8IGNvbnN0cmFpbnQgPT09ICdtaW4nICYmIHZhbHVlIDwgd2luZG93V2lkdGg7XG5cblx0XHRcdFx0XHRyZXR1cm4gbXFDaGFuZ2UoZmFrZU1hdGNoTWVkaWEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBmYWtlTWF0Y2hNZWRpYVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQoZGVib3VuY2VSZXNpemUpO1xuXHRcdFx0XHRcdGRlYm91bmNlUmVzaXplID0gJHRpbWVvdXQobW1MaXN0ZW5lciwgZGVib3VuY2VTcGVlZCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHdpbi5iaW5kKCdyZXNpemUnLCBmYWtlTWF0Y2hNZWRpYVJlc2l6ZSk7XG5cblx0XHRcdFx0JHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHdpbi51bmJpbmQoJ3Jlc2l6ZScsIGZha2VNYXRjaE1lZGlhUmVzaXplKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuIG1tTGlzdGVuZXIoKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XSk7XG59KSgpOyIsIi8vIFVzZXIgQVBJICRodHRwIGNhbGxzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5zZXJ2aWNlKCdyc3ZwRGF0YScsIHJzdnBEYXRhKTtcblxuXHQvKipcblx0ICogR0VUIHByb21pc2UgcmVzcG9uc2UgZnVuY3Rpb25cblx0ICogQ2hlY2tzIHR5cGVvZiBkYXRhIHJldHVybmVkIGFuZCBzdWNjZWVkcyBpZiBKUyBvYmplY3QsIHRocm93cyBlcnJvciBpZiBub3Rcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlIHsqfSBkYXRhIGZyb20gJGh0dHBcblx0ICogQHJldHVybnMgeyp9IG9iamVjdCwgYXJyYXlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIF9nZXRSZXMocmVzcG9uc2UpIHtcblx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdyZXRyaWV2ZWQgZGF0YSBpcyBub3QgdHlwZW9mIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRyc3ZwRGF0YS4kaW5qZWN0ID0gWyckaHR0cCddO1xuXG5cdGZ1bmN0aW9uIHJzdnBEYXRhKCRodHRwKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IGFsbCBSU1ZQZWQgZ3Vlc3RzIGZvciBhIHNwZWNpZmljIGV2ZW50IGJ5IGV2ZW50IElEXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRJZCB7c3RyaW5nfSBldmVudCBNb25nb0RCIF9pZFxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0RXZlbnRHdWVzdHMgPSBmdW5jdGlvbihldmVudElkKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmdldCgnL2FwaS9yc3Zwcy9ldmVudC8nICsgZXZlbnRJZClcblx0XHRcdFx0LnRoZW4oX2dldFJlcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZSBhIG5ldyBSU1ZQIGZvciBhbiBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50SWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcGFyYW0gcnN2cERhdGEge29iamVjdH0gbmV3IFJTVlAgZGF0YVxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuY3JlYXRlUnN2cCA9IGZ1bmN0aW9uKGV2ZW50SWQsIHJzdnBEYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LnBvc3QoJy9hcGkvcnN2cC9ldmVudC8nICsgZXZlbnRJZCwgcnN2cERhdGEpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGUgYW4gUlNWUCBieSBzcGVjaWZpYyBSU1ZQIElEXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gcnN2cElkIHtzdHJpbmd9IFJTVlAgTW9uZ29EQiBfaWRcblx0XHQgKiBAcGFyYW0gcnN2cERhdGEge29iamVjdH0gdXBkYXRlZCBSU1ZQIGRhdGFcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLnVwZGF0ZVJzdnAgPSBmdW5jdGlvbihyc3ZwSWQsIHJzdnBEYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LnB1dCgnL2FwaS9yc3ZwLycgKyByc3ZwSWQsIHJzdnBEYXRhKTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZpbHRlcigndHJ1c3RBc0hUTUwnLCB0cnVzdEFzSFRNTCk7XG5cblx0dHJ1c3RBc0hUTUwuJGluamVjdCA9IFsnJHNjZSddO1xuXG5cdGZ1bmN0aW9uIHRydXN0QXNIVE1MKCRzY2UpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24gKHRleHQpIHtcblx0XHRcdHJldHVybiAkc2NlLnRydXN0QXNIdG1sKHRleHQpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiLy8gRm9yIGV2ZW50cyBiYXNlZCBvbiB2aWV3cG9ydCBzaXplIC0gdXBkYXRlcyBhcyB2aWV3cG9ydCBpcyByZXNpemVkXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZpZXdTd2l0Y2gnLCB2aWV3U3dpdGNoKTtcblxuXHR2aWV3U3dpdGNoLiRpbmplY3QgPSBbJ21lZGlhQ2hlY2snLCAnTVEnLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiB2aWV3U3dpdGNoKG1lZGlhQ2hlY2ssIE1RLCAkdGltZW91dCkge1xuXG5cdFx0dmlld1N3aXRjaExpbmsuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHQvKipcblx0XHQgKiB2aWV3U3dpdGNoIGRpcmVjdGl2ZSBsaW5rIGZ1bmN0aW9uXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gJHNjb3BlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdmlld1N3aXRjaExpbmsoJHNjb3BlKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLnZzID0ge307XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBlbnRlciBtZWRpYSBxdWVyeVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9lbnRlckZuKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnZzLnZpZXdmb3JtYXQgPSAnc21hbGwnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGV4aXQgbWVkaWEgcXVlcnlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXhpdEZuKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnZzLnZpZXdmb3JtYXQgPSAnbGFyZ2UnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBtZWRpYUNoZWNrXG5cdFx0XHRtZWRpYUNoZWNrLmluaXQoe1xuXHRcdFx0XHRzY29wZTogJHNjb3BlLFxuXHRcdFx0XHRtcTogTVEuU01BTEwsXG5cdFx0XHRcdGVudGVyOiBfZW50ZXJGbixcblx0XHRcdFx0ZXhpdDogX2V4aXRGblxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogdmlld1N3aXRjaExpbmtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0V2ZW50RGV0YWlsQ3RybCcsIEV2ZW50RGV0YWlsQ3RybCk7XG5cblx0RXZlbnREZXRhaWxDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICdGaXJlJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gRXZlbnREZXRhaWxDdHJsKCRzY29wZSwgJHJvb3RTY29wZSwgJHJvdXRlUGFyYW1zLCBGaXJlLCBFdmVudCkge1xuXHRcdHZhciBldmVudCA9IHRoaXM7XG5cdFx0dmFyIF9ldmVudElkID0gJHJvdXRlUGFyYW1zLmV2ZW50SWQ7XG5cblx0XHRldmVudC5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvLyBzeW5jaHJvbm91c2x5IHJldHJpZXZlIHVzZXIgZGF0YVxuXHRcdGV2ZW50LnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHRldmVudC5zaG93TW9kYWwgPSBmYWxzZTtcblxuXHRcdGV2ZW50Lm9wZW5Sc3ZwTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdGV2ZW50LnNob3dNb2RhbCA9IHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCB1c2VyJ3MgUlNWUCBmb3IgdGhpcyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZ2V0VXNlclJzdnAoKSB7XG5cdFx0XHR2YXIgcnN2cHMgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUlNWUHMgaGF2ZSBiZWVuIGZldGNoZWQgc3VjY2Vzc2Z1bGx5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBzTG9hZGVkU3VjY2VzcygpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByc3Zwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHZhciB0aGlzUnN2cCA9IHJzdnBzW2ldO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXNSc3ZwLmV2ZW50SWQgPT09IF9ldmVudElkICYmIHRoaXNSc3ZwLnVzZXJJZCA9PT0gZXZlbnQudXNlci51aWQpIHtcblx0XHRcdFx0XHRcdGV2ZW50LnJzdnBPYmogPSB0aGlzUnN2cDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGV2ZW50Lm5vUnN2cCA9ICFldmVudC5yc3ZwT2JqO1xuXG5cdFx0XHRcdHZhciBndWVzdHMgPSAhZXZlbnQubm9Sc3ZwID8gZXZlbnQucnN2cE9iai5ndWVzdHMgOiBudWxsO1xuXG5cdFx0XHRcdGlmICghZXZlbnQubm9Sc3ZwICYmICEhZ3Vlc3RzID09PSBmYWxzZSB8fCBndWVzdHMgPT0gMSkge1xuXHRcdFx0XHRcdGV2ZW50Lmd1ZXN0VGV4dCA9IGV2ZW50LnJzdnBPYmoubmFtZSArICcgaXMnO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGd1ZXN0cyAmJiBndWVzdHMgPiAxKSB7XG5cdFx0XHRcdFx0ZXZlbnQuZ3Vlc3RUZXh0ID0gZXZlbnQucnN2cE9iai5uYW1lICsgJyArICcgKyAoZ3Vlc3RzIC0gMSkgKyAnIGFyZSAnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXZlbnQuYXR0ZW5kaW5nVGV4dCA9ICFldmVudC5ub1JzdnAgJiYgZXZlbnQucnN2cE9iai5hdHRlbmRpbmcgPyAnYXR0ZW5kaW5nJyA6ICdub3QgYXR0ZW5kaW5nJztcblx0XHRcdFx0ZXZlbnQucnN2cEJ0blRleHQgPSBldmVudC5ub1JzdnAgPyAnUlNWUCcgOiAnVXBkYXRlIG15IFJTVlAnO1xuXHRcdFx0XHRldmVudC5zaG93RXZlbnREb3dubG9hZCA9IGV2ZW50LnJzdnBPYmogJiYgZXZlbnQucnN2cE9iai5hdHRlbmRpbmc7XG5cdFx0XHRcdGV2ZW50LmNyZWF0ZU9yVXBkYXRlID0gZXZlbnQubm9Sc3ZwID8gJ2NyZWF0ZScgOiAndXBkYXRlJztcblx0XHRcdFx0ZXZlbnQucnN2cFJlYWR5ID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0cnN2cHMuJGxvYWRlZCgpLnRoZW4oX3JzdnBzTG9hZGVkU3VjY2Vzcyk7XG5cdFx0fVxuXG5cdFx0X2dldFVzZXJSc3ZwKCk7XG5cblx0XHQvLyB3aGVuIFJTVlAgaGFzIGJlZW4gc3VibWl0dGVkLCB1cGRhdGUgdXNlciBkYXRhXG5cdFx0JHJvb3RTY29wZS4kb24oJ3JzdnBTdWJtaXR0ZWQnLCBfZ2V0VXNlclJzdnApO1xuXG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgLmljcyBmaWxlIGZvciB0aGlzIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZW5lcmF0ZUljYWwoKSB7XG5cdFx0XHRldmVudC5jYWwgPSBpY3MoKTtcblxuXHRcdFx0dmFyIF9zdGFydEQgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGV2ZW50LmRldGFpbC5zdGFydERhdGUsIGV2ZW50LmRldGFpbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRfZW5kRCA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZlbnQuZGV0YWlsLmVuZERhdGUsIGV2ZW50LmRldGFpbC5lbmRUaW1lKTtcblxuXHRcdFx0ZXZlbnQuY2FsLmFkZEV2ZW50KGV2ZW50LmRldGFpbC50aXRsZSwgZXZlbnQuZGV0YWlsLmRlc2NyaXB0aW9uLCBldmVudC5kZXRhaWwubG9jYXRpb24sIF9zdGFydEQsIF9lbmREKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEb3dubG9hZCAuaWNzIGZpbGVcblx0XHQgKi9cblx0XHRldmVudC5kb3dubG9hZEljcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZXZlbnQuY2FsLmRvd25sb2FkKCk7XG5cdFx0fTtcblxuXHRcdHZhciBldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBzaW5nbGUgZXZlbnQgZGV0YWlsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7b2JqZWN0fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0ZXZlbnQuZGV0YWlsID0gZXZlbnRzLiRnZXRSZWNvcmQoX2V2ZW50SWQpO1xuXG5cdFx0XHRpZiAoZXZlbnQuZGV0YWlsKSB7XG5cdFx0XHRcdGV2ZW50LmRldGFpbC5wcmV0dHlEYXRlID0gRXZlbnQuZ2V0UHJldHR5RGF0ZXRpbWUoZXZlbnQuZGV0YWlsKTtcblx0XHRcdFx0ZXZlbnQuZGV0YWlsLmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKGV2ZW50LmRldGFpbCk7XG5cdFx0XHR9XG5cblx0XHRcdGV2ZW50LmV2ZW50UmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50cy4kbG9hZGVkKF9ldmVudFN1Y2Nlc3MpO1xuXG5cdFx0dmFyIF93YXRjaFJzdnBSZWFkeSA9ICRzY29wZS4kd2F0Y2goJ2V2ZW50LnJzdnBSZWFkeScsIGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRpZiAobmV3VmFsICYmIGV2ZW50LmRldGFpbCAmJiBldmVudC5kZXRhaWwucnN2cCkge1xuXHRcdFx0XHRfZ2VuZXJhdGVJY2FsKCk7XG5cdFx0XHRcdF93YXRjaFJzdnBSZWFkeSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgncnN2cEZvcm0nLCByc3ZwRm9ybSk7XG5cblx0cnN2cEZvcm0uJGluamVjdCA9IFsnRmlyZScsICckdGltZW91dCcsICckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gcnN2cEZvcm0oRmlyZSwgJHRpbWVvdXQsICRyb290U2NvcGUpIHtcblxuXHRcdHJzdnBGb3JtQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIHJzdnBGb3JtQ3RybCgkc2NvcGUpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBzeW50YXhcblx0XHRcdHZhciByZiA9IHRoaXM7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGZvcm0gaXMgY3JlYXRlIG9yIGVkaXQgKGRvZXMgdGhlIG1vZGVsIGFscmVhZHkgZXhpc3Qgb3Igbm90KVxuXHRcdFx0dmFyIF9pc0NyZWF0ZSA9ICEhcmYuZm9ybU1vZGVsSWQgPT09IGZhbHNlO1xuXHRcdFx0dmFyIF9pc0VkaXQgPSAhIXJmLmZvcm1Nb2RlbElkID09PSB0cnVlO1xuXG5cdFx0XHQvLyBnZXQgUlNWUHNcblx0XHRcdHZhciByc3ZwcztcblxuXHRcdFx0cmYubnVtYmVyUmVnZXggPSAvXihbMS05XXwxMCkkLztcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHZXQgdGhlIFJTVlAgdGhhdCBzaG91bGQgYmUgZWRpdGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldEVkaXRSc3ZwKCkge1xuXHRcdFx0XHRyc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0XHRyc3Zwcy4kbG9hZGVkKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZi5mb3JtTW9kZWwgPSByc3Zwcy4kZ2V0UmVjb3JkKHJmLmZvcm1Nb2RlbElkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0cnN2cHMgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdFx0cmYuZm9ybU1vZGVsID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogcmYudXNlcklkLFxuXHRcdFx0XHRcdGV2ZW50TmFtZTogcmYuZXZlbnQudGl0bGUsXG5cdFx0XHRcdFx0ZXZlbnRJZDogcmYuZXZlbnQuJGlkLFxuXHRcdFx0XHRcdG5hbWU6IHJmLnVzZXJOYW1lXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0X2dldEVkaXRSc3ZwKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogV3JhcCAkd2F0Y2ggaW4gYSBmdW5jdGlvbiBzbyB0aGF0IGl0IGNhbiBiZSByZS1pbml0aWFsaXplZCBhZnRlciBpdCdzIGJlZW4gZGVyZWdpc3RlcmVkXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9zdGFydFdhdGNoQXR0ZW5kaW5nKCkge1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogV2F0Y2ggdXNlcidzIGF0dGVuZGluZyBpbnB1dCBhbmQgaWYgdHJ1ZSwgc2V0IGRlZmF1bHQgbnVtYmVyIG9mIGd1ZXN0cyB0byAxXG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIEB0eXBlIHsqfGZ1bmN0aW9uKCl9XG5cdFx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHR2YXIgX3dhdGNoQXR0ZW5kaW5nID0gJHNjb3BlLiR3YXRjaCgncmYuZm9ybU1vZGVsLmF0dGVuZGluZycsIGZ1bmN0aW9uIChuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0XHRcdGlmIChuZXdWYWwgPT09IHRydWUgJiYgIW9sZFZhbCAmJiAhcmYuZm9ybU1vZGVsLmd1ZXN0cykge1xuXHRcdFx0XHRcdFx0cmYuZm9ybU1vZGVsLmd1ZXN0cyA9IDE7XG5cblx0XHRcdFx0XHRcdC8vIGRlcmVnaXN0ZXIgJHdhdGNoXG5cdFx0XHRcdFx0XHRfd2F0Y2hBdHRlbmRpbmcoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdGFydCB3YXRjaGluZyByZi5mb3JtTW9kZWwuYXR0ZW5kaW5nXG5cdFx0XHRfc3RhcnRXYXRjaEF0dGVuZGluZygpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJlc2V0IHRoZSBzdGF0ZSBvZiB0aGUgZm9ybSBTdWJtaXQgYnV0dG9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2J0blN1Ym1pdFJlc2V0KCkge1xuXHRcdFx0XHRyZi5idG5TYXZlZCA9IGZhbHNlO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1N1Ym1pdCBSU1ZQJyA6ICdVcGRhdGUgUlNWUCc7XG5cdFx0XHR9XG5cblx0XHRcdF9idG5TdWJtaXRSZXNldCgpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBSU1ZQIEFQSSBjYWxsIHN1Y2NlZWRlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwU3VjY2VzcygpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSB0cnVlO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1N1Ym1pdHRlZCEnIDogJ1VwZGF0ZWQhJztcblxuXHRcdFx0XHQkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3JzdnBTdWJtaXR0ZWQnKTtcblxuXHRcdFx0XHQvLyB1c2VyIGhhcyBzdWJtaXR0ZWQgYW4gUlNWUDsgdXBkYXRlIGNyZWF0ZS9lZGl0IHN0YXR1cyBpbiBjYXNlIHRoZXkgZWRpdCB3aXRob3V0IHJlZnJlc2hpbmdcblx0XHRcdFx0X2lzQ3JlYXRlID0gZmFsc2U7XG5cdFx0XHRcdF9pc0VkaXQgPSB0cnVlO1xuXG5cdFx0XHRcdC8vIHJlc3RhcnQgJHdhdGNoIG9uIHJmLmZvcm1Nb2RlbC5hdHRlbmRpbmdcblx0XHRcdFx0X3N0YXJ0V2F0Y2hBdHRlbmRpbmcoKTtcblxuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfYnRuU3VibWl0UmVzZXQoKTtcblx0XHRcdFx0XHRyZi5zaG93TW9kYWwgPSBmYWxzZTtcblx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdCRyb290U2NvcGUuJG9uKCdyc3ZwU3VibWl0dGVkJywgX2dldEVkaXRSc3ZwKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgUlNWUCBBUEkgY2FsbCBlcnJvclxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwRXJyb3IoZXJyKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gJ2Vycm9yJztcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdFcnJvciBzdWJtaXR0aW5nIScgOiAnRXJyb3IgdXBkYXRpbmchJztcblxuXHRcdFx0XHRjb25zb2xlLmxvZyhyZi5idG5TdWJtaXRUZXh0LCBlcnIpO1xuXG5cdFx0XHRcdCR0aW1lb3V0KF9idG5TdWJtaXRSZXNldCwgMzAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgc3VibWl0IGJ1dHRvblxuXHRcdFx0ICogU3VibWl0IFJTVlAgdG8gQVBJXG5cdFx0XHQgKiBGb3JtIEAgcnN2cEZvcm0udHBsLmh0bWxcblx0XHRcdCAqL1xuXHRcdFx0cmYuc3VibWl0UnN2cCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gJ1NlbmRpbmcuLi4nO1xuXG5cdFx0XHRcdGlmICghcmYuZm9ybU1vZGVsLmF0dGVuZGluZykge1xuXHRcdFx0XHRcdHJmLmZvcm1Nb2RlbC5ndWVzdHMgPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRcdHJzdnBzLiRhZGQocmYuZm9ybU1vZGVsKS50aGVuKF9yc3ZwU3VjY2VzcywgX3JzdnBFcnJvcik7XG5cblx0XHRcdFx0fSBlbHNlIGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdFx0cnN2cHMuJHNhdmUocmYuZm9ybU1vZGVsKS50aGVuKF9yc3ZwU3VjY2VzcywgX3JzdnBFcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgZnVuY3Rpb24gdG8gY2xvc2UgdGhlIG1vZGFsIHdpbmRvd1xuXHRcdFx0ICovXG5cdFx0XHRyZi5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJmLnNob3dNb2RhbCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGV2ZW50OiAnPScsXG5cdFx0XHRcdHVzZXJOYW1lOiAnQCcsXG5cdFx0XHRcdHVzZXJJZDogJ0AnLFxuXHRcdFx0XHRmb3JtTW9kZWxJZDogJ0AnLFxuXHRcdFx0XHRzaG93TW9kYWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnL25nLWFwcC9ldmVudC1kZXRhaWwvcnN2cEZvcm0udHBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogcnN2cEZvcm1DdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAncmYnLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdFdmVudHNDdHJsJywgRXZlbnRzQ3RybCk7XG5cblx0RXZlbnRzQ3RybC4kaW5qZWN0ID0gWydGaXJlJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gRXZlbnRzQ3RybChGaXJlLCBFdmVudCkge1xuXHRcdHZhciBldmVudHMgPSB0aGlzO1xuXG5cdFx0ZXZlbnRzLmFsbEV2ZW50cyA9IEZpcmUuZXZlbnRzKCk7XG5cblx0XHQvLyBzeW5jaHJvbm91c2x5IHJldHJpZXZlIHVzZXIgZGF0YVxuXHRcdGV2ZW50cy51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBldmVudHMgbGlzdFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge0FycmF5fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudHNTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmFsbEV2ZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgdGhpc0V2dCA9IGV2ZW50cy5hbGxFdmVudHNbaV07XG5cblx0XHRcdFx0dGhpc0V2dC5zdGFydERhdGVKUyA9IEV2ZW50LmdldEpTRGF0ZXRpbWUodGhpc0V2dC5zdGFydERhdGUsIHRoaXNFdnQuc3RhcnRUaW1lKTtcblx0XHRcdFx0dGhpc0V2dC5leHBpcmVkID0gRXZlbnQuZXhwaXJlZCh0aGlzRXZ0KTtcblx0XHRcdH1cblxuXHRcdFx0ZXZlbnRzLmV2ZW50c1JlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRldmVudHMuYWxsRXZlbnRzLiRsb2FkZWQoKS50aGVuKF9ldmVudHNTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRldmVudHMuc29ydFN0YXJ0RGF0ZSA9IGZ1bmN0aW9uKGV2dCkge1xuXHRcdFx0cmV0dXJuIEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZ0LnN0YXJ0RGF0ZSwgZXZ0LnN0YXJ0VGltZSk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5maWx0ZXIoJ3ByZXR0eURhdGUnLCBwcmV0dHlEYXRlKTtcblxuXHRmdW5jdGlvbiBwcmV0dHlEYXRlKCkge1xuXHRcdC8qKlxuXHRcdCAqIFRha2VzIGEgZGF0ZSBzdHJpbmcgYW5kIGNvbnZlcnRzIGl0IHRvIGEgcHJldHR5IGRhdGVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRlU3RyIHtzdHJpbmd9XG5cdFx0ICovXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIChkYXRlU3RyKSB7XG5cdFx0XHR2YXIgZCA9IG5ldyBEYXRlKGRhdGVTdHIpLFxuXHRcdFx0XHRtb250aHNBcnIgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ10sXG5cdFx0XHRcdG1vbnRoID0gbW9udGhzQXJyW2QuZ2V0TW9udGgoKV0sXG5cdFx0XHRcdGRheSA9IGQuZ2V0RGF0ZSgpLFxuXHRcdFx0XHR5ZWFyID0gZC5nZXRGdWxsWWVhcigpLFxuXHRcdFx0XHRwcmV0dHlEYXRlO1xuXG5cdFx0XHRwcmV0dHlEYXRlID0gbW9udGggKyAnICcgKyBkYXkgKyAnLCAnICsgeWVhcjtcblxuXHRcdFx0cmV0dXJuIHByZXR0eURhdGU7XG5cdFx0fTtcblx0fVxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ215QXBwJylcclxuXHRcdC5jb250cm9sbGVyKCdIZWFkZXJDdHJsJywgaGVhZGVyQ3RybCk7XHJcblxyXG5cdGhlYWRlckN0cmwuJGluamVjdCA9IFsnJGxvY2F0aW9uJywgJ2xvY2FsRGF0YScsICdGaXJlJywgJyRyb290U2NvcGUnXTtcclxuXHJcblx0ZnVuY3Rpb24gaGVhZGVyQ3RybCgkbG9jYXRpb24sIGxvY2FsRGF0YSwgRmlyZSwgJHJvb3RTY29wZSkge1xyXG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxyXG5cdFx0dmFyIGhlYWRlciA9IHRoaXM7XHJcblxyXG5cdFx0Ly8gYXV0aGVudGljYXRpb24gY29udHJvbHNcclxuXHRcdHZhciBfYXV0aCA9IEZpcmUuYXV0aCgpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2V0IHRoZSBsb2NhbCBkYXRhIGZyb20gSlNPTlxyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSBkYXRhXHJcblx0XHQgKiBAcHJpdmF0ZVxyXG5cdFx0ICovXHJcblx0XHRmdW5jdGlvbiBfbG9jYWxEYXRhU3VjY2VzcyhkYXRhKSB7XHJcblx0XHRcdGhlYWRlci5sb2NhbERhdGEgPSBkYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxvY2FsRGF0YS5nZXRKU09OKCkudGhlbihfbG9jYWxEYXRhU3VjY2Vzcyk7XHJcblxyXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2VcclxuXHRcdGhlYWRlci5kYXRhID0gRmlyZS5kYXRhKCk7XHJcblx0XHRoZWFkZXIudXNlciA9IEZpcmUucmVmLmdldEF1dGgoKTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFN1Y2Nlc3MgZnVuY3Rpb24gZnJvbSBhdXRoZW50aWNhdGluZ1xyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSBhdXRoRGF0YSB7b2JqZWN0fVxyXG5cdFx0ICovXHJcblx0XHRmdW5jdGlvbiBfb25BdXRoQ2IoYXV0aERhdGEpIHtcclxuXHRcdFx0aGVhZGVyLnVzZXIgPSBhdXRoRGF0YTtcclxuXHJcblx0XHRcdGlmICghYXV0aERhdGEpIHtcclxuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBvbiBsb2dpbiBvciBsb2dvdXRcclxuXHRcdF9hdXRoLiRvbkF1dGgoX29uQXV0aENiKTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIExvZyB0aGUgdXNlciBvdXQgb2Ygd2hhdGV2ZXIgYXV0aGVudGljYXRpb24gdGhleSd2ZSBzaWduZWQgaW4gd2l0aFxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdF9hdXRoLiR1bmF1dGgoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDdXJyZW50bHkgYWN0aXZlIG5hdiBpdGVtIHdoZW4gJy8nIGluZGV4XHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIuaW5kZXhJc0FjdGl2ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHRcdFx0Ly8gcGF0aCBzaG91bGQgYmUgJy8nXHJcblx0XHRcdHJldHVybiAkbG9jYXRpb24ucGF0aCgpID09PSBwYXRoO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEN1cnJlbnRseSBhY3RpdmUgbmF2IGl0ZW1cclxuXHRcdCAqXHJcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5uYXZJc0FjdGl2ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHRcdFx0cmV0dXJuICRsb2NhdGlvbi5wYXRoKCkuc3Vic3RyKDAsIHBhdGgubGVuZ3RoKSA9PT0gcGF0aDtcclxuXHRcdH07XHJcblx0fVxyXG5cclxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ25hdkNvbnRyb2wnLCBuYXZDb250cm9sKTtcblxuXHRuYXZDb250cm9sLiRpbmplY3QgPSBbJ21lZGlhQ2hlY2snLCAnTVEnLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiBuYXZDb250cm9sKG1lZGlhQ2hlY2ssIE1RLCAkdGltZW91dCkge1xuXG5cdFx0bmF2Q29udHJvbExpbmsuJGluamVjdCA9IFsnJHNjb3BlJywgJyRlbGVtZW50JywgJyRhdHRycyddO1xuXG5cdFx0ZnVuY3Rpb24gbmF2Q29udHJvbExpbmsoJHNjb3BlKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLm5hdiA9IHt9O1xuXG5cdFx0XHR2YXIgX2JvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJ2JvZHknKSxcblx0XHRcdFx0X25hdk9wZW47XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogT3BlbiBtb2JpbGUgbmF2aWdhdGlvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9vcGVuTmF2KCkge1xuXHRcdFx0XHRfYm9keVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnbmF2LWNsb3NlZCcpXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduYXYtb3BlbicpO1xuXG5cdFx0XHRcdF9uYXZPcGVuID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbG9zZSBtb2JpbGUgbmF2aWdhdGlvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9jbG9zZU5hdigpIHtcblx0XHRcdFx0X2JvZHlcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ25hdi1vcGVuJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25hdi1jbG9zZWQnKTtcblxuXHRcdFx0XHRfbmF2T3BlbiA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBlbnRlcmluZyBtb2JpbGUgbWVkaWEgcXVlcnlcblx0XHRcdCAqIENsb3NlIG5hdiBhbmQgc2V0IHVwIG1lbnUgdG9nZ2xpbmcgZnVuY3Rpb25hbGl0eVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9lbnRlck1vYmlsZSgpIHtcblx0XHRcdFx0X2Nsb3NlTmF2KCk7XG5cblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdCAqIFRvZ2dsZSBtb2JpbGUgbmF2aWdhdGlvbiBvcGVuL2Nsb3NlZFxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdCRzY29wZS5uYXYudG9nZ2xlTmF2ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFfbmF2T3Blbikge1xuXHRcdFx0XHRcdFx0XHRfb3Blbk5hdigpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0X2Nsb3NlTmF2KCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JHNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIF9jbG9zZU5hdik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGV4aXRpbmcgbW9iaWxlIG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKiBEaXNhYmxlIG1lbnUgdG9nZ2xpbmcgYW5kIHJlbW92ZSBib2R5IGNsYXNzZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXhpdE1vYmlsZSgpIHtcblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCRzY29wZS5uYXYudG9nZ2xlTmF2ID0gbnVsbDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0X2JvZHkucmVtb3ZlQ2xhc3MoJ25hdi1jbG9zZWQgbmF2LW9wZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIGZ1bmN0aW9uYWxpdHkgdG8gcnVuIG9uIGVudGVyL2V4aXQgb2YgbWVkaWEgcXVlcnlcblx0XHRcdG1lZGlhQ2hlY2suaW5pdCh7XG5cdFx0XHRcdHNjb3BlOiAkc2NvcGUsXG5cdFx0XHRcdG1xOiBNUS5TTUFMTCxcblx0XHRcdFx0ZW50ZXI6IF9lbnRlck1vYmlsZSxcblx0XHRcdFx0ZXhpdDogX2V4aXRNb2JpbGVcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdGxpbms6IG5hdkNvbnRyb2xMaW5rXG5cdFx0fTtcblx0fVxuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignTG9naW5DdHJsJywgTG9naW5DdHJsKTtcblxuXHRMb2dpbkN0cmwuJGluamVjdCA9IFsnRmlyZScsICdPQVVUSCcsICckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICdsb2NhbERhdGEnXTtcblxuXHRmdW5jdGlvbiBMb2dpbkN0cmwoRmlyZSwgT0FVVEgsICRyb290U2NvcGUsICRsb2NhdGlvbiwgbG9jYWxEYXRhKSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBsb2dpbiA9IHRoaXM7XG5cblx0XHQvLyBGaXJlYmFzZSBhdXRoZW50aWNhdGlvblxuXHRcdHZhciBfYXV0aCA9IEZpcmUuYXV0aCgpO1xuXG5cdFx0dmFyIF9sb2dnZWRJbiA9IEZpcmUucmVmLmdldEF1dGgoKTtcblxuXHRcdGlmIChfbG9nZ2VkSW4pIHtcblx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvJyk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gX2xvY2FsRGF0YVN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0bG9naW4ubG9jYWxEYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHRsb2NhbERhdGEuZ2V0SlNPTigpLnRoZW4oX2xvY2FsRGF0YVN1Y2Nlc3MpO1xuXG5cdFx0bG9naW4ubG9naW5zID0gT0FVVEguTE9HSU5TO1xuXG5cdFx0LyoqXG5cdFx0ICogQXV0aGVudGljYXRlIHRoZSB1c2VyIHZpYSBPYXV0aCB3aXRoIHRoZSBzcGVjaWZpZWQgcHJvdmlkZXJcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtICh0d2l0dGVyLCBmYWNlYm9vaywgZ2l0aHViLCBnb29nbGUpXG5cdFx0ICovXG5cdFx0bG9naW4uYXV0aGVudGljYXRlID0gZnVuY3Rpb24ocHJvdmlkZXIpIHtcblx0XHRcdGxvZ2luLmxvZ2dpbmdJbiA9IHRydWU7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogU3VjY2Vzc2Z1bGx5IGF1dGhlbnRpY2F0ZWRcblx0XHRcdCAqIEdvIHRvIGluaXRpYWxseSBpbnRlbmRlZCBhdXRoZW50aWNhdGVkIHBhdGhcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gcmVzcG9uc2Uge29iamVjdH0gcHJvbWlzZSByZXNwb25zZVxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2F1dGhTdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGxvZ2luLmxvZ2dpbmdJbiA9IGZhbHNlO1xuXG5cdFx0XHRcdGlmICgkcm9vdFNjb3BlLmF1dGhQYXRoKSB7XG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJHJvb3RTY29wZS5hdXRoUGF0aCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRfYXV0aC4kYXV0aFdpdGhPQXV0aFBvcHVwKHByb3ZpZGVyKVxuXHRcdFx0XHQudGhlbihfYXV0aFN1Y2Nlc3MpXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHRcdGxvZ2luLmxvZ2dpbmdJbiA9ICdlcnJvcic7XG5cdFx0XHRcdFx0bG9naW4ubG9naW5Nc2cgPSAnJ1xuXHRcdFx0XHR9KTtcblx0XHR9O1xuXHR9XG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==