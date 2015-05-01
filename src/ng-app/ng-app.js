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
			edit.btnDeleteText = 'Deleting...';
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

				if (_isCreate) {
					events.$add(ef.formModel).then(_eventSuccess, _eventError);

				} else if (_isEdit) {
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

			console.log('get user rsvp data!');
			var rsvps = Fire.rsvps();

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
			var _isCreate = !!rf.formModelId === false,
				_isEdit = !!rf.formModelId === true;

			var rsvps = Fire.rsvps();

			rf.numberRegex = /^([1-9]|10)$/;

			if (_isCreate) {
				rf.formModel = {
					userId: rf.userId,
					eventName: rf.event.title,
					eventId: rf.event.$id,
					name: rf.userName
				};
			}

			if (_isEdit) {
				rsvps.$loaded(function () {
					rf.formModel = rsvps.$getRecord(rf.formModelId);
				});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUuanMiLCJhY2NvdW50L0FjY291bnQuY3RybC5qcyIsImFkbWluL0FkbWluLmN0cmwuanMiLCJhZG1pbi9BZG1pbkV2ZW50TGlzdC5jdHJsLmpzIiwiYWRtaW4vRWRpdEV2ZW50LmN0cmwuanMiLCJhZG1pbi9ldmVudEZvcm0uZGlyLmpzIiwiYWRtaW4vdmFsaWRhdGVEYXRlRnV0dXJlLmRpci5qcyIsImFkbWluL3ZpZXdFdmVudEd1ZXN0cy5kaXIuanMiLCJjb3JlL0V2ZW50LmZhY3RvcnkuanMiLCJjb3JlL0ZpcmUuZmFjdG9yeS5qcyIsImNvcmUvTVEuY29uc3RhbnQuanMiLCJjb3JlL09BVVRILmNvbnN0YW50LmpzIiwiY29yZS9VdGlscy5mYWN0b3J5LmpzIiwiY29yZS9hcHAuYXV0aC5qcyIsImNvcmUvYXBwLmNvbmZpZy5qcyIsImNvcmUvZGV0ZWN0QWRCbG9jay5kaXIuanMiLCJjb3JlL2V2ZW50RGF0YS5zZXJ2aWNlLmpzIiwiY29yZS9sb2NhbERhdGEuc2VydmljZS5qcyIsImNvcmUvbWVkaWFDaGVjay5zZXJ2aWNlLmpzIiwiY29yZS9yc3ZwRGF0YS5zZXJ2aWNlLmpzIiwiY29yZS90cnVzdEFzSFRNTC5maWx0ZXIuanMiLCJjb3JlL3ZpZXdTd2l0Y2guZGlyLmpzIiwiZXZlbnQtZGV0YWlsL0V2ZW50RGV0YWlsLmN0cmwuanMiLCJldmVudC1kZXRhaWwvcnN2cEZvcm0uZGlyLmpzIiwiZXZlbnRzL0V2ZW50cy5jdHJsLmpzIiwiZXZlbnRzL3ByZXR0eURhdGUuZmlsdGVyLmpzIiwiaGVhZGVyL0hlYWRlci5jdHJsLmpzIiwiaGVhZGVyL25hdkNvbnRyb2wuZGlyLmpzIiwibG9naW4vTG9naW4uY3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJuZy1hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyXG5cdC5tb2R1bGUoJ215QXBwJywgWydmaXJlYmFzZScsICduZ1JvdXRlJywgJ25nUmVzb3VyY2UnLCAnbmdTYW5pdGl6ZScsICduZ01lc3NhZ2VzJywgJ21lZGlhQ2hlY2snLCAndWkuYm9vdHN0cmFwJ10pOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FjY291bnRDdHJsJywgQWNjb3VudEN0cmwpO1xuXG5cdEFjY291bnRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nLCAnRmlyZScsICdVdGlscycsICdPQVVUSCcsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIEFjY291bnRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBGaXJlLCBVdGlscywgT0FVVEgsICR0aW1lb3V0KSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhY2NvdW50ID0gdGhpcztcblxuXHRcdC8vIFRPRE86IHNob3cgdXNlcidzIGdlbmVyYWwgaW5mb3JtYXRpb25cblx0XHQvLyBUT0RPOiBzaG93IHVzZXIncyBSU1ZQc1xuXHRcdC8vIFRPRE86IHJlbW92ZSB0YWJzIChub3QgbmVjZXNzYXJ5KVxuXG5cdFx0YWNjb3VudC5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvLyBnZXQgdXNlciBzeW5jaHJvbm91c2x5IGFuZCBncmFiIG5lY2Vzc2FyeSBkYXRhIHRvIGRpc3BsYXlcblx0XHRhY2NvdW50LnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cdFx0YWNjb3VudC5sb2dpbnMgPSBPQVVUSC5MT0dJTlM7XG5cblx0XHR2YXIgX3Byb3ZpZGVyID0gYWNjb3VudC51c2VyLnByb3ZpZGVyO1xuXHRcdHZhciBfcHJvZmlsZSA9IGFjY291bnQudXNlcltfcHJvdmlkZXJdLmNhY2hlZFVzZXJQcm9maWxlO1xuXG5cdFx0YWNjb3VudC51c2VyTmFtZSA9IGFjY291bnQudXNlcltfcHJvdmlkZXJdLmRpc3BsYXlOYW1lO1xuXHRcdGFjY291bnQudXNlclBpY3R1cmUgPSBVdGlscy5nZXRVc2VyUGljdHVyZShhY2NvdW50LnVzZXIpO1xuXG5cdFx0dmFyIHJzdnBEYXRhID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0ZnVuY3Rpb24gX2dldE15UnN2cHMoZGF0YSkge1xuXHRcdFx0YWNjb3VudC5yc3ZwcyA9IFtdO1xuXG5cdFx0XHR2YXIgX2FsbFJzdnBzID0gZGF0YTtcblxuXHRcdFx0Zm9yICh2YXIgbiA9IDA7IG4gPCBfYWxsUnN2cHMubGVuZ3RoOyBuKyspIHtcblx0XHRcdFx0dmFyIF90aGlzID0gX2FsbFJzdnBzW25dO1xuXG5cdFx0XHRcdGlmIChfdGhpcy51c2VySWQgPT09IGFjY291bnQudXNlci51aWQpIHtcblx0XHRcdFx0XHRhY2NvdW50LnJzdnBzLnB1c2goX3RoaXMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGFjY291bnQucnN2cHNSZWFkeSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cnN2cERhdGEuJGxvYWRlZCgpLnRoZW4oX2dldE15UnN2cHMpO1xuXG5cdFx0dmFyIF90YWIgPSAkbG9jYXRpb24uc2VhcmNoKCkudmlldztcblxuXHRcdGFjY291bnQudGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1VzZXIgSW5mbycsXG5cdFx0XHRcdHF1ZXJ5OiAndXNlci1pbmZvJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1JTVlBzJyxcblx0XHRcdFx0cXVlcnk6ICdyc3Zwcydcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0YWNjb3VudC5jdXJyZW50VGFiID0gX3RhYiA/IF90YWIgOiAndXNlci1pbmZvJztcblxuXHRcdC8qKlxuXHRcdCAqIENoYW5nZSB0YWJzIGJ5IHdhdGNoaW5nIGZvciByb3V0ZSB1cGRhdGVcblx0XHQgKi9cblx0XHQkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgbmV4dCkge1xuXHRcdFx0YWNjb3VudC5jdXJyZW50VGFiID0gbmV4dC5wYXJhbXMudmlldyB8fCAndXNlci1pbmZvJztcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCB1c2VyJ3MgcHJvZmlsZSBpbmZvcm1hdGlvblxuXHRcdCAqL1xuXHRcdGFjY291bnQuZ2V0UHJvZmlsZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIHVzZXIncyBwcm9maWxlIGRhdGFcblx0XHRcdCAqIFNob3cgQWNjb3VudCBVSVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldFVzZXJTdWNjZXNzKGRhdGEpIHtcblx0XHRcdFx0YWNjb3VudC51c2VyID0gZGF0YTtcblx0XHRcdFx0YWNjb3VudC5hZG1pbmlzdHJhdG9yID0gYWNjb3VudC51c2VyLmlzQWRtaW47XG5cdFx0XHRcdGFjY291bnQubGlua2VkQWNjb3VudHMgPSBVc2VyLmdldExpbmtlZEFjY291bnRzKGFjY291bnQudXNlciwgJ2FjY291bnQnKTtcblx0XHRcdFx0YWNjb3VudC5zaG93QWNjb3VudCA9IHRydWU7XG5cdFx0XHRcdGFjY291bnQucnN2cHMgPSBhY2NvdW50LnVzZXIucnN2cHM7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGVycm9yIEFQSSBjYWxsIGdldHRpbmcgdXNlcidzIHByb2ZpbGUgZGF0YVxuXHRcdFx0ICogU2hvdyBhbiBlcnJvciBhbGVydCBpbiB0aGUgVUlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gZXJyb3Jcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9nZXRVc2VyRXJyb3IoZXJyb3IpIHtcblx0XHRcdFx0YWNjb3VudC5lcnJvckdldHRpbmdVc2VyID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0dXNlckRhdGEuZ2V0VXNlcigpLnRoZW4oX2dldFVzZXJTdWNjZXNzLCBfZ2V0VXNlckVycm9yKTtcblx0XHR9O1xuXG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignQWRtaW5DdHJsJywgQWRtaW5DdHJsKTtcblxuXHRBZG1pbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdGaXJlJ107XG5cblx0ZnVuY3Rpb24gQWRtaW5DdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBGaXJlKSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhZG1pbiA9IHRoaXM7XG5cblx0XHRhZG1pbi51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2Vcblx0XHRhZG1pbi5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHR2YXIgX3RhYiA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuXG5cdFx0YWRtaW4udGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ0V2ZW50cycsXG5cdFx0XHRcdHF1ZXJ5OiAnZXZlbnRzJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ0FkZCBFdmVudCcsXG5cdFx0XHRcdHF1ZXJ5OiAnYWRkLWV2ZW50J1xuXHRcdFx0fVxuXHRcdF07XG5cblx0XHRhZG1pbi5jdXJyZW50VGFiID0gX3RhYiA/IF90YWIgOiAnZXZlbnRzJztcblxuXHRcdC8qKlxuXHRcdCAqIENoYW5nZSB0YWJzIGJ5IHdhdGNoaW5nIGZvciByb3V0ZSB1cGRhdGVcblx0XHQgKi9cblx0XHQkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgbmV4dCkge1xuXHRcdFx0YWRtaW4uY3VycmVudFRhYiA9IG5leHQucGFyYW1zLnZpZXcgfHwgJ2V2ZW50cyc7XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBTaG93IFJTVlBlZCBndWVzdCBtb2RhbFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50SWQge3N0cmluZ30gZXZlbnQgSUQgdG8gZ2V0IFJTVlBzIGZvclxuXHRcdCAqIEBwYXJhbSBldmVudE5hbWUge3N0cmluZ30gZXZlbnQgbmFtZSB0byBnZXQgUlNWUHMgZm9yXG5cdFx0ICovXG5cdFx0YWRtaW4uc2hvd0d1ZXN0cyA9IGZ1bmN0aW9uKGV2ZW50SWQsIGV2ZW50TmFtZSkge1xuXHRcdFx0YWRtaW4uc2hvd0d1ZXN0c0V2ZW50SWQgPSBldmVudElkO1xuXHRcdFx0YWRtaW4uc2hvd0d1ZXN0c0V2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHRcdGFkbWluLnNob3dNb2RhbCA9IHRydWU7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdBZG1pbkV2ZW50TGlzdEN0cmwnLCBBZG1pbkV2ZW50TGlzdEN0cmwpO1xuXG5cdEFkbWluRXZlbnRMaXN0Q3RybC4kaW5qZWN0ID0gWydGaXJlJywgJyRsb2NhdGlvbicsICckdGltZW91dCcsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIEFkbWluRXZlbnRMaXN0Q3RybChGaXJlLCAkbG9jYXRpb24sICR0aW1lb3V0LCBFdmVudCkge1xuXHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHR2YXIgYUV2dCA9IHRoaXM7XG5cblx0XHRhRXZ0LmV2dFVybCA9ICRsb2NhdGlvbi5wcm90b2NvbCgpICsgJzovLycgKyAkbG9jYXRpb24uaG9zdCgpICsgJy9ldmVudC8nO1xuXG5cdFx0LyoqXG5cdFx0ICogSGlkZSBVUkwgaW5wdXQgZmllbGQgd2hlbiBibHVycmVkXG5cdFx0ICovXG5cdFx0YUV2dC5ibHVyVXJsSW5wdXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFFdnQuY29weUlucHV0ID0gbnVsbDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU2hvdyBVUkwgaW5wdXQgZmllbGQgd2hlbiBJRCBsaW5rIGlzIGNsaWNrZWRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpbmRleFxuXHRcdCAqL1xuXHRcdGFFdnQuc2hvd1VybElucHV0ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGFFdnQuY29weUlucHV0ID0gaW5kZXg7XG5cblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoJyNlJyArIGluZGV4KS5maW5kKCdpbnB1dCcpLnNlbGVjdCgpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8vIGdldCBldmVudHMgZnJvbSBGaXJlYmFzZVxuXHRcdGFFdnQuZXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRhRXZ0LnNvcnRTdGFydERhdGUgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdHJldHVybiBFdmVudC5nZXRKU0RhdGV0aW1lKGV2dC5zdGFydERhdGUsIGV2dC5zdGFydFRpbWUpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignRWRpdEV2ZW50Q3RybCcsIEVkaXRFdmVudEN0cmwpO1xuXG5cdEVkaXRFdmVudEN0cmwuJGluamVjdCA9IFsnRmlyZScsICckcm91dGVQYXJhbXMnLCAnJGxvY2F0aW9uJywgJyR0aW1lb3V0J107XG5cblx0ZnVuY3Rpb24gRWRpdEV2ZW50Q3RybChGaXJlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHRpbWVvdXQpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGVkaXQgPSB0aGlzO1xuXG5cdFx0Ly8gZ2V0IHRoZSBldmVudCBJRFxuXHRcdHZhciBfZXZlbnRJZCA9ICRyb3V0ZVBhcmFtcy5ldmVudElkO1xuXG5cdFx0Ly8gZ2V0IGV2ZW50c1xuXHRcdHZhciBldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0Ly8gdGFic1xuXHRcdGVkaXQudGFicyA9IFsnVXBkYXRlIERldGFpbHMnLCAnRGVsZXRlIEV2ZW50J107XG5cdFx0ZWRpdC5jdXJyZW50VGFiID0gMDtcblxuXHRcdC8qKlxuXHRcdCAqIFN3aXRjaCB0YWJzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gaW5kZXgge251bWJlcn0gdGFiIGluZGV4XG5cdFx0ICovXG5cdFx0ZWRpdC5jaGFuZ2VUYWIgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0ZWRpdC5jdXJyZW50VGFiID0gaW5kZXg7XG5cdFx0fTtcblxuXHRcdC8vIHN5bmNocm9ub3VzbHkgcmV0cmlldmUgdXNlciBkYXRhXG5cdFx0ZWRpdC51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2Vcblx0XHRlZGl0LmRhdGEgPSBGaXJlLmRhdGEoKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgc2luZ2xlIGV2ZW50IGRldGFpbFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gZXZlbnRzIGRhdGFcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0ZWRpdC5lZGl0RXZlbnQgPSBldmVudHMuJGdldFJlY29yZChfZXZlbnRJZCk7XG5cdFx0XHRlZGl0LnNob3dFZGl0Rm9ybSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZXZlbnRzLiRsb2FkZWQoX2V2ZW50U3VjY2Vzcyk7XG5cblx0XHQvKipcblx0XHQgKiBSZXNldCB0aGUgZGVsZXRlIGJ1dHRvbiB0byBkZWZhdWx0IHN0YXRlXG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9idG5EZWxldGVSZXNldCgpIHtcblx0XHRcdGVkaXQuYnRuRGVsZXRlID0gZmFsc2U7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRGVsZXRlIEV2ZW50Jztcblx0XHR9XG5cblx0XHRfYnRuRGVsZXRlUmVzZXQoKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIHJldHVybmVkIG9uIHN1Y2Nlc3NmdWwgZGVsZXRpb24gb2YgZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2RlbGV0ZVN1Y2Nlc3MoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRGVsZXRlZCEnO1xuXHRcdFx0ZWRpdC5idG5EZWxldGUgPSB0cnVlO1xuXHRcdFx0ZWRpdC5lZGl0RXZlbnQgPSB7fTtcblxuXHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvYWRtaW4nKTtcblx0XHRcdH0sIDE1MDApO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIHJldHVybmVkIG9uIGVycm9yIGRlbGV0aW5nIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9kZWxldGVFcnJvcigpIHtcblx0XHRcdGVkaXQuYnRuRGVsZXRlVGV4dCA9ICdFcnJvciBkZWxldGluZyEnO1xuXG5cdFx0XHQkdGltZW91dChfYnRuRGVsZXRlUmVzZXQsIDMwMDApO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZSB0aGUgZXZlbnRcblx0XHQgKi9cblx0XHRlZGl0LmRlbGV0ZUV2ZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRGVsZXRpbmcuLi4nO1xuXHRcdFx0ZXZlbnRzLiRyZW1vdmUoZWRpdC5lZGl0RXZlbnQpLnRoZW4oX2RlbGV0ZVN1Y2Nlc3MsIF9kZWxldGVFcnJvcik7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ2V2ZW50Rm9ybScsIGV2ZW50Rm9ybSk7XG5cblx0ZXZlbnRGb3JtLiRpbmplY3QgPSBbJ0ZpcmUnLCAnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRmaWx0ZXInLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBldmVudEZvcm0oRmlyZSwgJHRpbWVvdXQsICRsb2NhdGlvbiwgJGZpbHRlciwgRXZlbnQpIHtcblxuXHRcdGV2ZW50Rm9ybUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHRmdW5jdGlvbiBldmVudEZvcm1DdHJsKCRzY29wZSkge1xuXHRcdFx0Ly8gY29udHJvbGxlckFzIHN5bnRheFxuXHRcdFx0dmFyIGVmID0gdGhpcztcblxuXHRcdFx0Ly8gY2hlY2sgaWYgZm9ybSBpcyBjcmVhdGUgb3IgZWRpdFxuXHRcdFx0dmFyIF9pc0NyZWF0ZSA9ICEhZWYucHJlZmlsbE1vZGVsSWQgPT09IGZhbHNlO1xuXHRcdFx0dmFyIF9pc0VkaXQgPSAhIWVmLnByZWZpbGxNb2RlbElkID09PSB0cnVlO1xuXG5cdFx0XHR2YXIgZXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdFx0ZWYudGltZVJlZ2V4ID0gL14oMD9bMS05XXwxWzAxMl0pKDpbMC01XVxcZCkgW0FQYXBdW21NXSQvaTtcblxuXHRcdFx0aWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0ZXZlbnRzLiRsb2FkZWQoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRlZi5mb3JtTW9kZWwgPSBldmVudHMuJGdldFJlY29yZChlZi5wcmVmaWxsTW9kZWxJZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBwcmV2ZW50IHNlbGVjdGluZyBkYXRlcyBpbiB0aGUgcGFzdFxuXHRcdFx0ZWYubWluRGF0ZSA9IG5ldyBEYXRlKCk7XG5cblx0XHRcdGVmLmRhdGVPcHRpb25zID0ge1xuXHRcdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0XHR9O1xuXG5cdFx0XHRlZi5zdGFydERhdGVPcGVuID0gZmFsc2U7XG5cdFx0XHRlZi5lbmREYXRlT3BlbiA9IGZhbHNlO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFRvZ2dsZSB0aGUgZGF0ZXBpY2tlciBvcGVuL2Nsb3NlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSAkZXZlbnQge29iamVjdH1cblx0XHRcdCAqIEBwYXJhbSBkYXRlTmFtZSB7c3RyaW5nfSBzdGFydERhdGUgLyBlbmREYXRlXG5cdFx0XHQgKi9cblx0XHRcdGVmLnRvZ2dsZURhdGVwaWNrZXIgPSBmdW5jdGlvbigkZXZlbnQsIGRhdGVOYW1lKSB7XG5cdFx0XHRcdCRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHRcdFx0ZWZbZGF0ZU5hbWUgKyAnT3BlbiddID0gIWVmW2RhdGVOYW1lICsgJ09wZW4nXTtcblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVHJhbnNmb3JtIGRhdGVzIHRvIGEgZm9ybWF0IEFuZ3VsYXJGaXJlIHdpbGwgc2F2ZSB0byBGaXJlYmFzZVxuXHRcdFx0ICogQW5ndWxhckZpcmUgd29udGZpeCBidWc6IGh0dHBzOi8vZ2l0aHViLmNvbS9maXJlYmFzZS9hbmd1bGFyZmlyZS9pc3N1ZXMvMzgxXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybiB7c3RyaW5nfSBtbS9kZC95eXl5XG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9mb3JtYXREYXRlKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuICRmaWx0ZXIoJ2RhdGUnKShkYXRlLCAnTU0vZGQveXl5eScpO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIE9uIHN0YXJ0IGRhdGUgdmFsaWQgYmx1ciwgdXBkYXRlIGVuZCBkYXRlIGlmIGVtcHR5XG5cdFx0XHQgKi9cblx0XHRcdGVmLnN0YXJ0RGF0ZUJsdXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKGVmLmZvcm1Nb2RlbCAmJiBlZi5mb3JtTW9kZWwuc3RhcnREYXRlICYmICFlZi5mb3JtTW9kZWwuZW5kRGF0ZSkge1xuXHRcdFx0XHRcdGVmLmZvcm1Nb2RlbC5lbmREYXRlID0gX2Zvcm1hdERhdGUoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmVzZXQgdGhlIHN0YXRlIG9mIHRoZSBmb3JtIFN1Ym1pdCBidXR0b25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYnRuU3VibWl0UmVzZXQoKSB7XG5cdFx0XHRcdGVmLmJ0blNhdmVkID0gZmFsc2U7XG5cdFx0XHRcdGVmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU3VibWl0JyA6ICdVcGRhdGUnO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEdvIHRvIEV2ZW50cyB0YWJcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZ29Ub0V2ZW50cygpIHtcblx0XHRcdFx0JGxvY2F0aW9uLnNlYXJjaCgndmlldycsICdldmVudHMnKTtcblx0XHRcdH1cblxuXHRcdFx0X2J0blN1Ym1pdFJlc2V0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGV2ZW50IEFQSSBjYWxsIHN1Y2NlZWRlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MocmVmKSB7XG5cdFx0XHRcdGVmLmJ0blNhdmVkID0gdHJ1ZTtcblx0XHRcdFx0ZWYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTYXZlZCEnIDogJ1VwZGF0ZWQhJztcblxuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0ZWYuc2hvd1JlZGlyZWN0TXNnID0gdHJ1ZTtcblx0XHRcdFx0XHQkdGltZW91dChfZ29Ub0V2ZW50cywgMjUwMCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRcdGVmLnNob3dVcGRhdGVEZXRhaWxMaW5rID0gdHJ1ZTtcblx0XHRcdFx0XHQkdGltZW91dChfYnRuU3VibWl0UmVzZXQsIDI1MDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGV2ZW50IEFQSSBjYWxsIGVycm9yXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2V2ZW50RXJyb3IoZXJyKSB7XG5cdFx0XHRcdGVmLmJ0blNhdmVkID0gJ2Vycm9yJztcblx0XHRcdFx0ZWYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdFcnJvciBzYXZpbmchJyA6ICdFcnJvciB1cGRhdGluZyEnO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKGVmLmJ0blN1Ym1pdFRleHQsIGVycik7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayBpZiBldmVudCBzdGFydCBhbmQgZW5kIGRhdGV0aW1lcyBhcmUgYSB2YWxpZCByYW5nZVxuXHRcdFx0ICogUnVucyBvbiBibHVyIG9mIGV2ZW50IGRhdGVzL3RpbWVzXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0XHQgKi9cblx0XHRcdGVmLnZhbGlkYXRlRGF0ZXJhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChlZi5mb3JtTW9kZWwgJiYgZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSAmJiBlZi5mb3JtTW9kZWwuc3RhcnRUaW1lICYmIGVmLmZvcm1Nb2RlbC5lbmREYXRlICYmIGVmLmZvcm1Nb2RlbC5lbmRUaW1lKSB7XG5cdFx0XHRcdFx0dmFyIHN0YXJ0RGF0ZXRpbWUgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGVmLmZvcm1Nb2RlbC5zdGFydERhdGUsIGVmLmZvcm1Nb2RlbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRcdFx0ZW5kRGF0ZXRpbWUgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGVmLmZvcm1Nb2RlbC5lbmREYXRlLCBlZi5mb3JtTW9kZWwuZW5kVGltZSk7XG5cblx0XHRcdFx0XHRlZi52YWxpZERhdGVyYW5nZSA9IChzdGFydERhdGV0aW1lIC0gZW5kRGF0ZXRpbWUpIDwgMDtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBzdWJtaXQgYnV0dG9uXG5cdFx0XHQgKiBTdWJtaXQgbmV3IGV2ZW50IHRvIEFQSVxuXHRcdFx0ICogRm9ybSBAIGV2ZW50Rm9ybS50cGwuaHRtbFxuXHRcdFx0ICovXG5cdFx0XHRlZi5zdWJtaXRFdmVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRlZi5mb3JtTW9kZWwuc3RhcnREYXRlID0gX2Zvcm1hdERhdGUoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSk7XG5cdFx0XHRcdGVmLmZvcm1Nb2RlbC5lbmREYXRlID0gX2Zvcm1hdERhdGUoZWYuZm9ybU1vZGVsLmVuZERhdGUpO1xuXG5cdFx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0XHRldmVudHMuJGFkZChlZi5mb3JtTW9kZWwpLnRoZW4oX2V2ZW50U3VjY2VzcywgX2V2ZW50RXJyb3IpO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRcdGV2ZW50cy4kc2F2ZShlZi5mb3JtTW9kZWwpLnRoZW4oX2V2ZW50U3VjY2VzcywgX2V2ZW50RXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdHByZWZpbGxNb2RlbElkOiAnQCdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJy9uZy1hcHAvYWRtaW4vZXZlbnRGb3JtLnRwbC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6IGV2ZW50Rm9ybUN0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdlZicsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgndmFsaWRhdGVEYXRlRnV0dXJlJywgdmFsaWRhdGVEYXRlRnV0dXJlKTtcblxuXHR2YWxpZGF0ZURhdGVGdXR1cmUuJGluamVjdCA9IFsnZXZlbnREYXRhJywgJyR0aW1lb3V0JywgJyRsb2NhdGlvbicsICckZmlsdGVyJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gdmFsaWRhdGVEYXRlRnV0dXJlKCkge1xuXG5cdFx0dmFsaWRhdGVEYXRlRnV0dXJlTGluay4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGVsZW0nLCAnJGF0dHJzJywgJ25nTW9kZWwnXTtcblxuXHRcdGZ1bmN0aW9uIHZhbGlkYXRlRGF0ZUZ1dHVyZUxpbmsoJHNjb3BlLCAkZWxlbSwgJGF0dHJzLCBuZ01vZGVsKSB7XG5cdFx0XHR2YXIgX25vdyA9IG5ldyBEYXRlKCksXG5cdFx0XHRcdF95ZXN0ZXJkYXkgPSBfbm93LnNldERhdGUoX25vdy5nZXREYXRlKCkgLSAxKTtcblxuXHRcdFx0bmdNb2RlbC4kcGFyc2Vycy51bnNoaWZ0KGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBfZCA9IERhdGUucGFyc2UodmFsdWUpLFxuXHRcdFx0XHRcdF92YWxpZCA9IF95ZXN0ZXJkYXkgLSBfZCA8IDA7XG5cblx0XHRcdFx0bmdNb2RlbC4kc2V0VmFsaWRpdHkoJ3Bhc3REYXRlJywgX3ZhbGlkKTtcblxuXHRcdFx0XHRyZXR1cm4gX3ZhbGlkID8gdmFsdWUgOiB1bmRlZmluZWQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0bmdNb2RlbC4kZm9ybWF0dGVycy51bnNoaWZ0KGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBfZCA9IERhdGUucGFyc2UodmFsdWUpLFxuXHRcdFx0XHRcdF92YWxpZCA9IF95ZXN0ZXJkYXkgLSBfZCA8IDA7XG5cblx0XHRcdFx0bmdNb2RlbC4kc2V0VmFsaWRpdHkoJ3Bhc3REYXRlJywgX3ZhbGlkKTtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0XHRyZXF1aXJlOiAnbmdNb2RlbCcsXG5cdFx0XHRsaW5rOiB2YWxpZGF0ZURhdGVGdXR1cmVMaW5rXG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgndmlld0V2ZW50R3Vlc3RzJywgdmlld0V2ZW50R3Vlc3RzKTtcblxuXHR2aWV3RXZlbnRHdWVzdHMuJGluamVjdCA9IFsnRmlyZSddO1xuXG5cdGZ1bmN0aW9uIHZpZXdFdmVudEd1ZXN0cyhGaXJlKSB7XG5cblx0XHR2aWV3RXZlbnRHdWVzdHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG5cdFx0ZnVuY3Rpb24gdmlld0V2ZW50R3Vlc3RzQ3RybCgkc2NvcGUpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBzeW50YXhcblx0XHRcdHZhciBnID0gdGhpcztcblxuXHRcdFx0dmFyIHJzdnBEYXRhID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0XHRmdW5jdGlvbiBfcnN2cERhdGFMb2FkZWQoZGF0YSkge1xuXHRcdFx0XHR2YXIgX2FsbFJzdnBzID0gZGF0YTtcblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2V0IHVwIGd1ZXN0bGlzdCBmb3Igdmlld1xuXHRcdFx0XHQgKiBTZXQgdXAgZ3Vlc3QgY291bnRzIGZvciB2aWV3XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIEBwYXJhbSBldmVudEd1ZXN0cyB7QXJyYXl9IGd1ZXN0cyB3aG8gaGF2ZSBSU1ZQZWQgdG8gc3BlY2lmaWMgZXZlbnRcblx0XHRcdFx0ICogQHByaXZhdGVcblx0XHRcdFx0ICovXG5cdFx0XHRcdGZ1bmN0aW9uIF9zaG93RXZlbnRHdWVzdHMoZXZlbnRHdWVzdHMpIHtcblx0XHRcdFx0XHR2YXIgX3RvdGFsR3Vlc3RzID0gMDtcblxuXHRcdFx0XHRcdGcuZ3Vlc3RzID0gZXZlbnRHdWVzdHM7XG5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGcuZ3Vlc3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHR2YXIgX3RoaXNHdWVzdCA9IGcuZ3Vlc3RzW2ldO1xuXG5cdFx0XHRcdFx0XHRpZiAoX3RoaXNHdWVzdC5hdHRlbmRpbmcpIHtcblx0XHRcdFx0XHRcdFx0X3RvdGFsR3Vlc3RzICs9IF90aGlzR3Vlc3QuZ3Vlc3RzO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGcudG90YWxHdWVzdHMgPSBfdG90YWxHdWVzdHM7XG5cdFx0XHRcdFx0Zy5ndWVzdHNSZWFkeSA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogJHdhdGNoIGV2ZW50IElEIGFuZCBjb2xsZWN0IHVwZGF0ZWQgc2V0cyBvZiBndWVzdHNcblx0XHRcdFx0ICovXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goJ2cuZXZlbnRJZCcsIGZ1bmN0aW9uIChuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0XHRcdGlmIChuZXdWYWwpIHtcblx0XHRcdFx0XHRcdHZhciBfZXZlbnRHdWVzdHMgPSBbXTtcblx0XHRcdFx0XHRcdGcuZ3Vlc3RzUmVhZHkgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgbiA9IDA7IG4gPCBfYWxsUnN2cHMubGVuZ3RoOyBuKyspIHtcblx0XHRcdFx0XHRcdFx0dmFyIF90aGlzR3Vlc3QgPSBfYWxsUnN2cHNbbl07XG5cblx0XHRcdFx0XHRcdFx0aWYgKF90aGlzR3Vlc3QuZXZlbnRJZCA9PT0gZy5ldmVudElkKSB7XG5cdFx0XHRcdFx0XHRcdFx0X2V2ZW50R3Vlc3RzLnB1c2goX3RoaXNHdWVzdCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0X3Nob3dFdmVudEd1ZXN0cyhfZXZlbnRHdWVzdHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHJzdnBEYXRhLiRsb2FkZWQoKS50aGVuKF9yc3ZwRGF0YUxvYWRlZCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xvc2UgdGhpcyBtb2RhbCBkaXJlY3RpdmVcblx0XHRcdCAqL1xuXHRcdFx0Zy5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGcuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGV2ZW50SWQ6ICc9Jyxcblx0XHRcdFx0ZXZlbnROYW1lOiAnPScsXG5cdFx0XHRcdHNob3dNb2RhbDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICcvbmctYXBwL2FkbWluL3ZpZXdFdmVudEd1ZXN0cy50cGwuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiB2aWV3RXZlbnRHdWVzdHNDdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZycsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fVxuXHR9XG59KSgpOyIsIi8vIEV2ZW50IGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnRXZlbnQnLCBFdmVudCk7XG5cblx0RXZlbnQuJGluamVjdCA9IFsnVXRpbHMnLCAnJGZpbHRlciddO1xuXG5cdGZ1bmN0aW9uIEV2ZW50KFV0aWxzLCAkZmlsdGVyKSB7XG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgYSBwcmV0dHkgZGF0ZSBmb3IgVUkgZGlzcGxheSBmcm9tIHRoZSBzdGFydCBhbmQgZW5kIGRhdGV0aW1lc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50T2JqIHtvYmplY3R9IHRoZSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSBwcmV0dHkgc3RhcnQgYW5kIGVuZCBkYXRlIC8gdGltZSBzdHJpbmdcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRQcmV0dHlEYXRldGltZShldmVudE9iaikge1xuXHRcdFx0dmFyIHN0YXJ0RGF0ZSA9IGV2ZW50T2JqLnN0YXJ0RGF0ZSxcblx0XHRcdFx0c3RhcnREID0gbmV3IERhdGUoc3RhcnREYXRlKSxcblx0XHRcdFx0c3RhcnRUaW1lID0gZXZlbnRPYmouc3RhcnRUaW1lLFxuXHRcdFx0XHRlbmREYXRlID0gZXZlbnRPYmouZW5kRGF0ZSxcblx0XHRcdFx0ZW5kRCA9IG5ldyBEYXRlKGVuZERhdGUpLFxuXHRcdFx0XHRlbmRUaW1lID0gZXZlbnRPYmouZW5kVGltZSxcblx0XHRcdFx0ZGF0ZUZvcm1hdFN0ciA9ICdNTU0gZCB5eXl5Jyxcblx0XHRcdFx0cHJldHR5U3RhcnREYXRlID0gJGZpbHRlcignZGF0ZScpKHN0YXJ0RCwgZGF0ZUZvcm1hdFN0ciksXG5cdFx0XHRcdHByZXR0eUVuZERhdGUgPSAkZmlsdGVyKCdkYXRlJykoZW5kRCwgZGF0ZUZvcm1hdFN0ciksXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lO1xuXG5cdFx0XHRpZiAocHJldHR5U3RhcnREYXRlID09PSBwcmV0dHlFbmREYXRlKSB7XG5cdFx0XHRcdC8vIGV2ZW50IHN0YXJ0cyBhbmQgZW5kcyBvbiB0aGUgc2FtZSBkYXlcblx0XHRcdFx0Ly8gQXByIDI5IDIwMTUsIDEyOjAwIFBNIC0gNTowMCBQTVxuXHRcdFx0XHRwcmV0dHlEYXRldGltZSA9IHByZXR0eVN0YXJ0RGF0ZSArICcsICcgKyBzdGFydFRpbWUgKyAnIC0gJyArIGVuZFRpbWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBldmVudCBzdGFydHMgYW5kIGVuZHMgb24gZGlmZmVyZW50IGRheXNcblx0XHRcdFx0Ly8gRGVjIDMxIDIwMTQsIDg6MDAgUE0gLSBKYW4gMSAyMDE1LCAxMTowMCBBTVxuXHRcdFx0XHRwcmV0dHlEYXRldGltZSA9IHByZXR0eVN0YXJ0RGF0ZSArICcsICcgKyBzdGFydFRpbWUgKyAnIC0gJyArIHByZXR0eUVuZERhdGUgKyAnLCAnICsgZW5kVGltZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHByZXR0eURhdGV0aW1lO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEdldCBKYXZhU2NyaXB0IERhdGUgZnJvbSBldmVudCBkYXRlIGFuZCB0aW1lIHN0cmluZ3Ncblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRlU3RyIHtzdHJpbmd9IG1tL2RkL3l5eVxuXHRcdCAqIEBwYXJhbSB0aW1lU3RyIHtzdHJpbmd9IGhoOm1tIEFNL1BNXG5cdFx0ICogQHJldHVybnMge0RhdGV9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0SlNEYXRldGltZShkYXRlU3RyLCB0aW1lU3RyKSB7XG5cdFx0XHR2YXIgZCA9IG5ldyBEYXRlKGRhdGVTdHIpLFxuXHRcdFx0XHR0aW1lQXJyID0gdGltZVN0ci5zcGxpdCgnICcpLFxuXHRcdFx0XHR0aW1lID0gdGltZUFyclswXS5zcGxpdCgnOicpLFxuXHRcdFx0XHRob3VycyA9IHRpbWVbMF0gKiAxLFxuXHRcdFx0XHRtaW51dGVzID0gdGltZVsxXSAqIDEsXG5cdFx0XHRcdGFtcG0gPSB0aW1lQXJyWzFdLFxuXHRcdFx0XHRmdWxsZGF0ZTtcblxuXHRcdFx0aWYgKGFtcG0gPT0gJ1BNJykge1xuXHRcdFx0XHRpZiAoaG91cnMgIT09IDEyKSB7XG5cdFx0XHRcdFx0aG91cnMgPSBob3VycyArIDEyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZ1bGxkYXRlID0gbmV3IERhdGUoZC5nZXRGdWxsWWVhcigpLCBkLmdldE1vbnRoKCksIGQuZ2V0RGF0ZSgpLCBob3VycywgbWludXRlcyk7XG5cblx0XHRcdHJldHVybiBmdWxsZGF0ZTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZXRlcm1pbmUgaWYgZXZlbnQgaXMgZXhwaXJlZFxuXHRcdCAqIChlbmQgZGF0ZS90aW1lIGhhcyBwYXNzZWQgY3VycmVudCBkYXRlL3RpbWUpXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZ0IHtvYmplY3R9IGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGV4cGlyZWQoZXZ0KSB7XG5cdFx0XHR2YXIganNTdGFydERhdGUgPSBnZXRKU0RhdGV0aW1lKGV2dC5lbmREYXRlLCBldnQuZW5kVGltZSksXG5cdFx0XHRcdG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHRcdHJldHVybiBqc1N0YXJ0RGF0ZSA8IG5vdztcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0UHJldHR5RGF0ZXRpbWU6IGdldFByZXR0eURhdGV0aW1lLFxuXHRcdFx0Z2V0SlNEYXRldGltZTogZ2V0SlNEYXRldGltZSxcblx0XHRcdGV4cGlyZWQ6IGV4cGlyZWRcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZhY3RvcnkoJ0ZpcmUnLCBGaXJlKTtcblxuXHRGaXJlLiRpbmplY3QgPSBbJyRmaXJlYmFzZUF1dGgnLCAnJGZpcmViYXNlT2JqZWN0JywgJyRmaXJlYmFzZUFycmF5J107XG5cblx0ZnVuY3Rpb24gRmlyZSgkZmlyZWJhc2VBdXRoLCAkZmlyZWJhc2VPYmplY3QsICRmaXJlYmFzZUFycmF5KSB7XG5cblx0XHR2YXIgdXJpID0gJ2h0dHBzOi8vaW50ZW5zZS1oZWF0LTU4MjIuZmlyZWJhc2Vpby5jb20vJztcblx0XHR2YXIgcmVmID0gbmV3IEZpcmViYXNlKHVyaSk7XG5cblx0XHQvKipcblx0XHQgKiBGaXJlYmFzZSBhdXRoZW50aWNhdGlvbiBjb250cm9sc1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMgeyp9IEF1dGhlbnRpY2F0aW9uXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gYXV0aCgpIHtcblx0XHRcdHJldHVybiAkZmlyZWJhc2VBdXRoKHJlZik7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRmV0Y2ggRmlyZWJhc2UgZGF0YVxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge29iamVjdH0gRmlyZWJhc2UgZGF0YSBvYmplY3Rcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkYXRhKCkge1xuXHRcdFx0dmFyIF9yZWYgPSBuZXcgRmlyZWJhc2UodXJpICsgJ2RhdGEnKTtcblx0XHRcdHJldHVybiAkZmlyZWJhc2VPYmplY3QoX3JlZik7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRmV0Y2ggRmlyZWJhc2UgRXZlbnRzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBGaXJlYmFzZSBhcnJheVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGV2ZW50cygpIHtcblx0XHRcdHZhciBfcmVmID0gbmV3IEZpcmViYXNlKHVyaSArICdldmVudHMnKTtcblx0XHRcdHJldHVybiAkZmlyZWJhc2VBcnJheShfcmVmKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCBGaXJlYmFzZSBSU1ZQc1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge29iamVjdH0gRmlyZWJhc2UgYXJyYXlcblx0XHQgKi9cblx0XHRmdW5jdGlvbiByc3ZwcygpIHtcblx0XHRcdHZhciBfcmVmID0gbmV3IEZpcmViYXNlKHVyaSArICdyc3ZwcycpO1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZUFycmF5KF9yZWYpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR1cmk6IHVyaSxcblx0XHRcdHJlZjogcmVmLFxuXHRcdFx0YXV0aDogYXV0aCxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRldmVudHM6IGV2ZW50cyxcblx0XHRcdHJzdnBzOiByc3Zwc1xuXHRcdH1cblx0fVxufSkoKTsiLCIvLyBtZWRpYSBxdWVyeSBjb25zdGFudHNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnN0YW50KCdNUScsIHtcblx0XHRcdFNNQUxMOiAnKG1heC13aWR0aDogNzY3cHgpJyxcblx0XHRcdExBUkdFOiAnKG1pbi13aWR0aDogNzY4cHgpJ1xuXHRcdH0pO1xufSkoKTsiLCIvLyBsb2dpbi9PYXV0aCBjb25zdGFudHNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnN0YW50KCdPQVVUSCcsIHtcblx0XHRcdExPR0lOUzogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0YWNjb3VudDogJ2dvb2dsZScsXG5cdFx0XHRcdFx0bmFtZTogJ0dvb2dsZScsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL2FjY291bnRzLmdvb2dsZS5jb20nXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRhY2NvdW50OiAndHdpdHRlcicsXG5cdFx0XHRcdFx0bmFtZTogJ1R3aXR0ZXInLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly90d2l0dGVyLmNvbSdcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGFjY291bnQ6ICdmYWNlYm9vaycsXG5cdFx0XHRcdFx0bmFtZTogJ0ZhY2Vib29rJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vZmFjZWJvb2suY29tJ1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0YWNjb3VudDogJ2dpdGh1YicsXG5cdFx0XHRcdFx0bmFtZTogJ0dpdEh1YicsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL2dpdGh1Yi5jb20nXG5cdFx0XHRcdH1cblx0XHRcdF1cblx0XHR9KTtcbn0pKCk7IiwiLy8gVXRpbGl0eSBmdW5jdGlvbnNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZhY3RvcnkoJ1V0aWxzJywgVXRpbHMpO1xuXG5cdGZ1bmN0aW9uIFV0aWxzKCkge1xuXHRcdGZ1bmN0aW9uIGdldFVzZXJQaWN0dXJlKHVzZXIpIHtcblx0XHRcdHZhciBfcHJvdmlkZXIgPSB1c2VyLnByb3ZpZGVyLFxuXHRcdFx0XHRfcHJvZmlsZSA9IHVzZXJbX3Byb3ZpZGVyXS5jYWNoZWRVc2VyUHJvZmlsZTtcblxuXHRcdFx0Ly8gVE9ETzogdHVybiB0aGlzIGludG8gYSBoYXNobWFwXG5cdFx0XHRpZiAoX3Byb3ZpZGVyID09PSAnZ2l0aHViJykge1xuXHRcdFx0XHRyZXR1cm4gX3Byb2ZpbGUuYXZhdGFyX3VybDtcblx0XHRcdH0gZWxzZSBpZiAoX3Byb3ZpZGVyID09PSAnZ29vZ2xlJykge1xuXHRcdFx0XHRyZXR1cm4gX3Byb2ZpbGUucGljdHVyZTtcblx0XHRcdH0gZWxzZSBpZiAoX3Byb3ZpZGVyID09PSAndHdpdHRlcicpIHtcblx0XHRcdFx0cmV0dXJuIF9wcm9maWxlLnByb2ZpbGVfaW1hZ2VfdXJsO1xuXHRcdFx0fSBlbHNlIGlmIChfcHJvdmlkZXIgPT09ICdmYWNlYm9vaycpIHtcblx0XHRcdFx0cmV0dXJuIF9wcm9maWxlLnBpY3R1cmUuZGF0YS51cmw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogR2V0IG9yZGluYWwgdmFsdWVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBuIHtudW1iZXJ9IGlmIGEgc3RyaW5nIGlzIHByb3ZpZGVkLCAlIHdpbGwgYXR0ZW1wdCB0byBjb252ZXJ0IHRvIG51bWJlclxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IHRoLCBzdCwgbmQsIHJkXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0T3JkaW5hbChuKSB7XG5cdFx0XHR2YXIgb3JkQXJyID0gWyd0aCcsICdzdCcsICduZCcsICdyZCddLFxuXHRcdFx0XHRtb2R1bHVzID0gbiAlIDEwMDtcblxuXHRcdFx0cmV0dXJuIG9yZEFyclsobW9kdWx1cyAtIDIwKSAlIDEwXSB8fCBvcmRBcnJbbW9kdWx1c10gfHwgb3JkQXJyWzBdO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRVc2VyUGljdHVyZTogZ2V0VXNlclBpY3R1cmUsXG5cdFx0XHRnZXRPcmRpbmFsOiBnZXRPcmRpbmFsXG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5ydW4oYXV0aFJ1bik7XG5cblx0YXV0aFJ1bi4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICdGaXJlJ107XG5cblx0ZnVuY3Rpb24gYXV0aFJ1bigkcm9vdFNjb3BlLCAkbG9jYXRpb24sIEZpcmUpIHtcblx0XHQkcm9vdFNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCkge1xuXHRcdFx0dmFyIF9pc0F1dGhlbnRpY2F0ZWQgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHRcdGlmIChuZXh0ICYmIG5leHQuJCRyb3V0ZSAmJiBuZXh0LiQkcm91dGUuc2VjdXJlICYmICFfaXNBdXRoZW50aWNhdGVkKSB7XG5cdFx0XHRcdCRyb290U2NvcGUuYXV0aFBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuXG5cdFx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBzZW5kIHVzZXIgdG8gbG9naW5cblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cbn0pKCk7IiwiLy8gcm91dGVzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb25maWcoYXBwQ29uZmlnKTtcblxuXHRhcHBDb25maWcuJGluamVjdCA9IFsnJHJvdXRlUHJvdmlkZXInLCAnJGxvY2F0aW9uUHJvdmlkZXInXTtcblxuXHRmdW5jdGlvbiBhcHBDb25maWcoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cdFx0JHJvdXRlUHJvdmlkZXJcblx0XHRcdC53aGVuKCcvJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9ldmVudHMvRXZlbnRzLnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvbG9naW4nLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2xvZ2luL0xvZ2luLnZpZXcuaHRtbCdcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2V2ZW50LzpldmVudElkJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9ldmVudC1kZXRhaWwvRXZlbnREZXRhaWwudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9ldmVudC86ZXZlbnRJZC9lZGl0Jywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hZG1pbi9FZGl0RXZlbnQudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9hY2NvdW50Jywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hY2NvdW50L0FjY291bnQudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlLFxuXHRcdFx0XHRyZWxvYWRPblNlYXJjaDogZmFsc2Vcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2FkbWluJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hZG1pbi9BZG1pbi52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWUsXG5cdFx0XHRcdHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuXHRcdFx0fSlcblx0XHRcdC5vdGhlcndpc2Uoe1xuXHRcdFx0XHRyZWRpcmVjdFRvOiAnLydcblx0XHRcdH0pO1xuXG5cdFx0JGxvY2F0aW9uUHJvdmlkZXJcblx0XHRcdC5odG1sNU1vZGUoe1xuXHRcdFx0XHRlbmFibGVkOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0Lmhhc2hQcmVmaXgoJyEnKTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdkZXRlY3RBZGJsb2NrJywgZGV0ZWN0QWRibG9jayk7XG5cblx0ZGV0ZWN0QWRibG9jay4kaW5qZWN0ID0gWyckdGltZW91dCcsICckbG9jYXRpb24nXTtcblxuXHRmdW5jdGlvbiBkZXRlY3RBZGJsb2NrKCR0aW1lb3V0LCAkbG9jYXRpb24pIHtcblxuXHRcdGRldGVjdEFkYmxvY2tMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbScsICckYXR0cnMnXTtcblxuXHRcdGZ1bmN0aW9uIGRldGVjdEFkYmxvY2tMaW5rKCRzY29wZSwgJGVsZW0sICRhdHRycykge1xuXHRcdFx0Ly8gZGF0YSBvYmplY3Rcblx0XHRcdCRzY29wZS5hYiA9IHt9O1xuXG5cdFx0XHQvLyBob3N0bmFtZSBmb3IgbWVzc2FnaW5nXG5cdFx0XHQkc2NvcGUuYWIuaG9zdCA9ICRsb2NhdGlvbi5ob3N0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2hlY2sgaWYgYWRzIGFyZSBibG9ja2VkIC0gY2FsbGVkIGluICR0aW1lb3V0IHRvIGxldCBBZEJsb2NrZXJzIHJ1blxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9hcmVBZHNCbG9ja2VkKCkge1xuXHRcdFx0XHR2YXIgX2EgPSAkZWxlbS5maW5kKCcuYWQtdGVzdCcpO1xuXG5cdFx0XHRcdCRzY29wZS5hYi5ibG9ja2VkID0gX2EuaGVpZ2h0KCkgPD0gMCB8fCAhJGVsZW0uZmluZCgnLmFkLXRlc3Q6dmlzaWJsZScpLmxlbmd0aDtcblx0XHRcdH1cblxuXHRcdFx0JHRpbWVvdXQoX2FyZUFkc0Jsb2NrZWQsIDIwMCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogZGV0ZWN0QWRibG9ja0xpbmssXG5cdFx0XHR0ZW1wbGF0ZTogICAnPGRpdiBjbGFzcz1cImFkLXRlc3QgZmEtZmFjZWJvb2sgZmEtdHdpdHRlclwiIHN0eWxlPVwiaGVpZ2h0OjFweDtcIj48L2Rpdj4nICtcblx0XHRcdFx0XHRcdCc8ZGl2IG5nLWlmPVwiYWIuYmxvY2tlZFwiIGNsYXNzPVwiYWItbWVzc2FnZSBhbGVydCBhbGVydC1kYW5nZXJcIj4nICtcblx0XHRcdFx0XHRcdFx0JzxpIGNsYXNzPVwiZmEgZmEtYmFuXCI+PC9pPiA8c3Ryb25nPkFkQmxvY2s8L3N0cm9uZz4gaXMgcHJvaGliaXRpbmcgaW1wb3J0YW50IGZ1bmN0aW9uYWxpdHkhIFBsZWFzZSBkaXNhYmxlIGFkIGJsb2NraW5nIG9uIDxzdHJvbmc+e3thYi5ob3N0fX08L3N0cm9uZz4uIFRoaXMgc2l0ZSBpcyBhZC1mcmVlLicgK1xuXHRcdFx0XHRcdFx0JzwvZGl2Pidcblx0XHR9XG5cdH1cblxufSkoKTsiLCIvLyBVc2VyIEFQSSAkaHR0cCBjYWxsc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuc2VydmljZSgnZXZlbnREYXRhJywgZXZlbnREYXRhKTtcblxuXHQvKipcblx0ICogR0VUIHByb21pc2UgcmVzcG9uc2UgZnVuY3Rpb25cblx0ICogQ2hlY2tzIHR5cGVvZiBkYXRhIHJldHVybmVkIGFuZCBzdWNjZWVkcyBpZiBKUyBvYmplY3QsIHRocm93cyBlcnJvciBpZiBub3Rcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlIHsqfSBkYXRhIGZyb20gJGh0dHBcblx0ICogQHJldHVybnMgeyp9IG9iamVjdCwgYXJyYXlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIF9nZXRSZXMocmVzcG9uc2UpIHtcblx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdyZXRyaWV2ZWQgZGF0YSBpcyBub3QgdHlwZW9mIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRldmVudERhdGEuJGluamVjdCA9IFsnJGh0dHAnXTtcblxuXHRmdW5jdGlvbiBldmVudERhdGEoJGh0dHApIHtcblx0XHQvKipcblx0XHQgKiBHZXQgZXZlbnQgYnkgSURcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpZCB7c3RyaW5nfSBldmVudCBNb25nb0RCIF9pZFxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0RXZlbnQgPSBmdW5jdGlvbihpZCkge1xuXHRcdFx0cmV0dXJuICRodHRwKHtcblx0XHRcdFx0bWV0aG9kOiAnR0VUJyxcblx0XHRcdFx0dXJsOiAnL2FwaS9ldmVudC8nICsgaWRcblx0XHRcdH0pLnRoZW4oX2dldFJlcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCBhbGwgZXZlbnRzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEFsbEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9hcGkvZXZlbnRzJylcblx0XHRcdFx0LnRoZW4oX2dldFJlcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZSBhIG5ldyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50RGF0YSB7b2JqZWN0fSBuZXcgZXZlbnQgZGF0YVxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuY3JlYXRlRXZlbnQgPSBmdW5jdGlvbihldmVudERhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucG9zdCgnL2FwaS9ldmVudC9uZXcnLCBldmVudERhdGEpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGUgYW4gZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudERhdGEge29iamVjdH0gdXBkYXRlZCBldmVudCBkYXRhXG5cdFx0ICogQHBhcmFtIGlkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy51cGRhdGVFdmVudCA9IGZ1bmN0aW9uKGlkLCBldmVudERhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucHV0KCcvYXBpL2V2ZW50LycgKyBpZCwgZXZlbnREYXRhKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlIGFuIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gaWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmRlbGV0ZUV2ZW50ID0gZnVuY3Rpb24oaWQpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQuZGVsZXRlKCcvYXBpL2V2ZW50LycgKyBpZCk7XG5cdFx0fVxuXHR9XG59KSgpOyIsIi8vIEZldGNoIGxvY2FsIEpTT04gZGF0YVxuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuc2VydmljZSgnbG9jYWxEYXRhJywgbG9jYWxEYXRhKTtcblxuXHQvKipcblx0ICogR0VUIHByb21pc2UgcmVzcG9uc2UgZnVuY3Rpb25cblx0ICogQ2hlY2tzIHR5cGVvZiBkYXRhIHJldHVybmVkIGFuZCBzdWNjZWVkcyBpZiBKUyBvYmplY3QsIHRocm93cyBlcnJvciBpZiBub3Rcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlIHsqfSBkYXRhIGZyb20gJGh0dHBcblx0ICogQHJldHVybnMgeyp9IG9iamVjdCwgYXJyYXlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIF9nZXRSZXMocmVzcG9uc2UpIHtcblx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdyZXRyaWV2ZWQgZGF0YSBpcyBub3QgdHlwZW9mIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRsb2NhbERhdGEuJGluamVjdCA9IFsnJGh0dHAnXTtcblxuXHRmdW5jdGlvbiBsb2NhbERhdGEoJGh0dHApIHtcblx0XHQvKipcblx0XHQgKiBHZXQgbG9jYWwgSlNPTiBkYXRhIGZpbGUgYW5kIHJldHVybiByZXN1bHRzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEpTT04gPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQuZ2V0KCcvbmctYXBwL2RhdGEvZGF0YS5qc29uJylcblx0XHRcdFx0LnRoZW4oX2dldFJlcyk7XG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBhbmd1bGFyTWVkaWFDaGVjayA9IGFuZ3VsYXIubW9kdWxlKCdtZWRpYUNoZWNrJywgW10pO1xuXG5cdGFuZ3VsYXJNZWRpYUNoZWNrLnNlcnZpY2UoJ21lZGlhQ2hlY2snLCBbJyR3aW5kb3cnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJHdpbmRvdywgJHRpbWVvdXQpIHtcblx0XHR0aGlzLmluaXQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdFx0dmFyICRzY29wZSA9IG9wdGlvbnNbJ3Njb3BlJ10sXG5cdFx0XHRcdHF1ZXJ5ID0gb3B0aW9uc1snbXEnXSxcblx0XHRcdFx0ZGVib3VuY2UgPSBvcHRpb25zWydkZWJvdW5jZSddLFxuXHRcdFx0XHQkd2luID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLFxuXHRcdFx0XHRicmVha3BvaW50cyxcblx0XHRcdFx0Y3JlYXRlTGlzdGVuZXIgPSB2b2lkIDAsXG5cdFx0XHRcdGhhc01hdGNoTWVkaWEgPSAkd2luZG93Lm1hdGNoTWVkaWEgIT09IHVuZGVmaW5lZCAmJiAhISR3aW5kb3cubWF0Y2hNZWRpYSgnIScpLmFkZExpc3RlbmVyLFxuXHRcdFx0XHRtcUxpc3RMaXN0ZW5lcixcblx0XHRcdFx0bW1MaXN0ZW5lcixcblx0XHRcdFx0ZGVib3VuY2VSZXNpemUsXG5cdFx0XHRcdG1xID0gdm9pZCAwLFxuXHRcdFx0XHRtcUNoYW5nZSA9IHZvaWQgMCxcblx0XHRcdFx0ZGVib3VuY2VTcGVlZCA9ICEhZGVib3VuY2UgPyBkZWJvdW5jZSA6IDI1MDtcblxuXHRcdFx0aWYgKGhhc01hdGNoTWVkaWEpIHtcblx0XHRcdFx0bXFDaGFuZ2UgPSBmdW5jdGlvbiAobXEpIHtcblx0XHRcdFx0XHRpZiAobXEubWF0Y2hlcyAmJiB0eXBlb2Ygb3B0aW9ucy5lbnRlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5lbnRlcihtcSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5leGl0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuZXhpdChtcSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5jaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdG9wdGlvbnMuY2hhbmdlKG1xKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y3JlYXRlTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0bXEgPSAkd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpO1xuXHRcdFx0XHRcdG1xTGlzdExpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1xQ2hhbmdlKG1xKVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRtcS5hZGRMaXN0ZW5lcihtcUxpc3RMaXN0ZW5lcik7XG5cblx0XHRcdFx0XHQvLyBiaW5kIHRvIHRoZSBvcmllbnRhdGlvbmNoYW5nZSBldmVudCBhbmQgZmlyZSBtcUNoYW5nZVxuXHRcdFx0XHRcdCR3aW4uYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBtcUxpc3RMaXN0ZW5lcik7XG5cblx0XHRcdFx0XHQvLyBjbGVhbnVwIGxpc3RlbmVycyB3aGVuICRzY29wZSBpcyAkZGVzdHJveWVkXG5cdFx0XHRcdFx0JHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRtcS5yZW1vdmVMaXN0ZW5lcihtcUxpc3RMaXN0ZW5lcik7XG5cdFx0XHRcdFx0XHQkd2luLnVuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBtcUxpc3RMaXN0ZW5lcik7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gbXFDaGFuZ2UobXEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHJldHVybiBjcmVhdGVMaXN0ZW5lcigpO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRicmVha3BvaW50cyA9IHt9O1xuXG5cdFx0XHRcdG1xQ2hhbmdlID0gZnVuY3Rpb24gKG1xKSB7XG5cdFx0XHRcdFx0aWYgKG1xLm1hdGNoZXMpIHtcblx0XHRcdFx0XHRcdGlmICghIWJyZWFrcG9pbnRzW3F1ZXJ5XSA9PT0gZmFsc2UgJiYgKHR5cGVvZiBvcHRpb25zLmVudGVyID09PSAnZnVuY3Rpb24nKSkge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmVudGVyKG1xKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PT0gdHJ1ZSB8fCBicmVha3BvaW50c1txdWVyeV0gPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuZXhpdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuZXhpdChtcSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoKG1xLm1hdGNoZXMgJiYgKCFicmVha3BvaW50c1txdWVyeV0pIHx8ICghbXEubWF0Y2hlcyAmJiAoYnJlYWtwb2ludHNbcXVlcnldID09PSB0cnVlIHx8IGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PSBudWxsKSkpKSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuY2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuY2hhbmdlKG1xKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gYnJlYWtwb2ludHNbcXVlcnldID0gbXEubWF0Y2hlcztcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgY29udmVydEVtVG9QeCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHRcdHZhciBlbUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuXHRcdFx0XHRcdGVtRWxlbWVudC5zdHlsZS53aWR0aCA9ICcxZW0nO1xuXHRcdFx0XHRcdGVtRWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbUVsZW1lbnQpO1xuXHRcdFx0XHRcdHB4ID0gdmFsdWUgKiBlbUVsZW1lbnQub2Zmc2V0V2lkdGg7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbUVsZW1lbnQpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHB4O1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBnZXRQWFZhbHVlID0gZnVuY3Rpb24gKHdpZHRoLCB1bml0KSB7XG5cdFx0XHRcdFx0dmFyIHZhbHVlO1xuXHRcdFx0XHRcdHZhbHVlID0gdm9pZCAwO1xuXHRcdFx0XHRcdHN3aXRjaCAodW5pdCkge1xuXHRcdFx0XHRcdFx0Y2FzZSAnZW0nOlxuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9IGNvbnZlcnRFbVRvUHgod2lkdGgpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gd2lkdGg7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRicmVha3BvaW50c1txdWVyeV0gPSBudWxsO1xuXG5cdFx0XHRcdG1tTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIHBhcnRzID0gcXVlcnkubWF0Y2goL1xcKCguKiktLio6XFxzKihbXFxkXFwuXSopKC4qKVxcKS8pLFxuXHRcdFx0XHRcdFx0Y29uc3RyYWludCA9IHBhcnRzWzFdLFxuXHRcdFx0XHRcdFx0dmFsdWUgPSBnZXRQWFZhbHVlKHBhcnNlSW50KHBhcnRzWzJdLCAxMCksIHBhcnRzWzNdKSxcblx0XHRcdFx0XHRcdGZha2VNYXRjaE1lZGlhID0ge30sXG5cdFx0XHRcdFx0XHR3aW5kb3dXaWR0aCA9ICR3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGg7XG5cblx0XHRcdFx0XHRmYWtlTWF0Y2hNZWRpYS5tYXRjaGVzID0gY29uc3RyYWludCA9PT0gJ21heCcgJiYgdmFsdWUgPiB3aW5kb3dXaWR0aCB8fCBjb25zdHJhaW50ID09PSAnbWluJyAmJiB2YWx1ZSA8IHdpbmRvd1dpZHRoO1xuXG5cdFx0XHRcdFx0cmV0dXJuIG1xQ2hhbmdlKGZha2VNYXRjaE1lZGlhKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgZmFrZU1hdGNoTWVkaWFSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGRlYm91bmNlUmVzaXplKTtcblx0XHRcdFx0XHRkZWJvdW5jZVJlc2l6ZSA9ICR0aW1lb3V0KG1tTGlzdGVuZXIsIGRlYm91bmNlU3BlZWQpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCR3aW4uYmluZCgncmVzaXplJywgZmFrZU1hdGNoTWVkaWFSZXNpemUpO1xuXG5cdFx0XHRcdCRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCR3aW4udW5iaW5kKCdyZXNpemUnLCBmYWtlTWF0Y2hNZWRpYVJlc2l6ZSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBtbUxpc3RlbmVyKCk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fV0pO1xufSkoKTsiLCIvLyBVc2VyIEFQSSAkaHR0cCBjYWxsc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuc2VydmljZSgncnN2cERhdGEnLCByc3ZwRGF0YSk7XG5cblx0LyoqXG5cdCAqIEdFVCBwcm9taXNlIHJlc3BvbnNlIGZ1bmN0aW9uXG5cdCAqIENoZWNrcyB0eXBlb2YgZGF0YSByZXR1cm5lZCBhbmQgc3VjY2VlZHMgaWYgSlMgb2JqZWN0LCB0aHJvd3MgZXJyb3IgaWYgbm90XG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSB7Kn0gZGF0YSBmcm9tICRodHRwXG5cdCAqIEByZXR1cm5zIHsqfSBvYmplY3QsIGFycmF5XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBfZ2V0UmVzKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcigncmV0cmlldmVkIGRhdGEgaXMgbm90IHR5cGVvZiBvYmplY3QuJyk7XG5cdFx0fVxuXHR9XG5cblx0cnN2cERhdGEuJGluamVjdCA9IFsnJGh0dHAnXTtcblxuXHRmdW5jdGlvbiByc3ZwRGF0YSgkaHR0cCkge1xuXHRcdC8qKlxuXHRcdCAqIEdldCBhbGwgUlNWUGVkIGd1ZXN0cyBmb3IgYSBzcGVjaWZpYyBldmVudCBieSBldmVudCBJRFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50SWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEV2ZW50R3Vlc3RzID0gZnVuY3Rpb24oZXZlbnRJZCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9hcGkvcnN2cHMvZXZlbnQvJyArIGV2ZW50SWQpXG5cdFx0XHRcdC50aGVuKF9nZXRSZXMpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYSBuZXcgUlNWUCBmb3IgYW4gZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudElkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHBhcmFtIHJzdnBEYXRhIHtvYmplY3R9IG5ldyBSU1ZQIGRhdGFcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZVJzdnAgPSBmdW5jdGlvbihldmVudElkLCByc3ZwRGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5wb3N0KCcvYXBpL3JzdnAvZXZlbnQvJyArIGV2ZW50SWQsIHJzdnBEYXRhKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIGFuIFJTVlAgYnkgc3BlY2lmaWMgUlNWUCBJRFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHJzdnBJZCB7c3RyaW5nfSBSU1ZQIE1vbmdvREIgX2lkXG5cdFx0ICogQHBhcmFtIHJzdnBEYXRhIHtvYmplY3R9IHVwZGF0ZWQgUlNWUCBkYXRhXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy51cGRhdGVSc3ZwID0gZnVuY3Rpb24ocnN2cElkLCByc3ZwRGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5wdXQoJy9hcGkvcnN2cC8nICsgcnN2cElkLCByc3ZwRGF0YSk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5maWx0ZXIoJ3RydXN0QXNIVE1MJywgdHJ1c3RBc0hUTUwpO1xuXG5cdHRydXN0QXNIVE1MLiRpbmplY3QgPSBbJyRzY2UnXTtcblxuXHRmdW5jdGlvbiB0cnVzdEFzSFRNTCgkc2NlKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uICh0ZXh0KSB7XG5cdFx0XHRyZXR1cm4gJHNjZS50cnVzdEFzSHRtbCh0ZXh0KTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIi8vIEZvciBldmVudHMgYmFzZWQgb24gdmlld3BvcnQgc2l6ZSAtIHVwZGF0ZXMgYXMgdmlld3BvcnQgaXMgcmVzaXplZFxuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCd2aWV3U3dpdGNoJywgdmlld1N3aXRjaCk7XG5cblx0dmlld1N3aXRjaC4kaW5qZWN0ID0gWydtZWRpYUNoZWNrJywgJ01RJywgJyR0aW1lb3V0J107XG5cblx0ZnVuY3Rpb24gdmlld1N3aXRjaChtZWRpYUNoZWNrLCBNUSwgJHRpbWVvdXQpIHtcblxuXHRcdHZpZXdTd2l0Y2hMaW5rLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG5cdFx0LyoqXG5cdFx0ICogdmlld1N3aXRjaCBkaXJlY3RpdmUgbGluayBmdW5jdGlvblxuXHRcdCAqXG5cdFx0ICogQHBhcmFtICRzY29wZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHZpZXdTd2l0Y2hMaW5rKCRzY29wZSkge1xuXHRcdFx0Ly8gZGF0YSBvYmplY3Rcblx0XHRcdCRzY29wZS52cyA9IHt9O1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZW50ZXIgbWVkaWEgcXVlcnlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZW50ZXJGbigpIHtcblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCRzY29wZS52cy52aWV3Zm9ybWF0ID0gJ3NtYWxsJztcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBleGl0IG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2V4aXRGbigpIHtcblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCRzY29wZS52cy52aWV3Zm9ybWF0ID0gJ2xhcmdlJztcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluaXRpYWxpemUgbWVkaWFDaGVja1xuXHRcdFx0bWVkaWFDaGVjay5pbml0KHtcblx0XHRcdFx0c2NvcGU6ICRzY29wZSxcblx0XHRcdFx0bXE6IE1RLlNNQUxMLFxuXHRcdFx0XHRlbnRlcjogX2VudGVyRm4sXG5cdFx0XHRcdGV4aXQ6IF9leGl0Rm5cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdGxpbms6IHZpZXdTd2l0Y2hMaW5rXG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdFdmVudERldGFpbEN0cmwnLCBFdmVudERldGFpbEN0cmwpO1xuXG5cdEV2ZW50RGV0YWlsQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHJvb3RTY29wZScsICckcm91dGVQYXJhbXMnLCAnRmlyZScsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIEV2ZW50RGV0YWlsQ3RybCgkc2NvcGUsICRyb290U2NvcGUsICRyb3V0ZVBhcmFtcywgRmlyZSwgRXZlbnQpIHtcblx0XHR2YXIgZXZlbnQgPSB0aGlzO1xuXHRcdHZhciBfZXZlbnRJZCA9ICRyb3V0ZVBhcmFtcy5ldmVudElkO1xuXG5cdFx0ZXZlbnQuZGF0YSA9IEZpcmUuZGF0YSgpO1xuXG5cdFx0Ly8gc3luY2hyb25vdXNseSByZXRyaWV2ZSB1c2VyIGRhdGFcblx0XHRldmVudC51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0ZXZlbnQuc2hvd01vZGFsID0gZmFsc2U7XG5cblx0XHRldmVudC5vcGVuUnN2cE1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRldmVudC5zaG93TW9kYWwgPSB0cnVlO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBHZXQgdXNlcidzIFJTVlAgZm9yIHRoaXMgZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2dldFVzZXJSc3ZwKCkge1xuXG5cdFx0XHRjb25zb2xlLmxvZygnZ2V0IHVzZXIgcnN2cCBkYXRhIScpO1xuXHRcdFx0dmFyIHJzdnBzID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJTVlBzIGhhdmUgYmVlbiBmZXRjaGVkIHN1Y2Nlc3NmdWxseVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IHJldHVybmVkIGZyb20gcHJvbWlzZVxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBzTG9hZGVkU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRcdHZhciBfcnN2cHMgPSBkYXRhO1xuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgX3JzdnBzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIHRoaXNSc3ZwID0gX3JzdnBzW2ldO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXNSc3ZwLmV2ZW50SWQgPT09IF9ldmVudElkICYmIHRoaXNSc3ZwLnVzZXJJZCA9PT0gZXZlbnQudXNlci51aWQpIHtcblx0XHRcdFx0XHRcdGV2ZW50LnJzdnBPYmogPSB0aGlzUnN2cDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGV2ZW50Lm5vUnN2cCA9ICFldmVudC5yc3ZwT2JqO1xuXG5cdFx0XHRcdHZhciBndWVzdHMgPSAhZXZlbnQubm9Sc3ZwID8gZXZlbnQucnN2cE9iai5ndWVzdHMgOiBudWxsO1xuXG5cdFx0XHRcdGlmICghZXZlbnQubm9Sc3ZwICYmICEhZ3Vlc3RzID09PSBmYWxzZSB8fCBndWVzdHMgPT0gMSkge1xuXHRcdFx0XHRcdGV2ZW50Lmd1ZXN0VGV4dCA9IGV2ZW50LnJzdnBPYmoubmFtZSArICcgaXMnO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGd1ZXN0cyAmJiBndWVzdHMgPiAxKSB7XG5cdFx0XHRcdFx0ZXZlbnQuZ3Vlc3RUZXh0ID0gZXZlbnQucnN2cE9iai5uYW1lICsgJyArICcgKyAoZ3Vlc3RzIC0gMSkgKyAnIGFyZSAnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXZlbnQuYXR0ZW5kaW5nVGV4dCA9ICFldmVudC5ub1JzdnAgJiYgZXZlbnQucnN2cE9iai5hdHRlbmRpbmcgPyAnYXR0ZW5kaW5nJyA6ICdub3QgYXR0ZW5kaW5nJztcblx0XHRcdFx0ZXZlbnQucnN2cEJ0blRleHQgPSBldmVudC5ub1JzdnAgPyAnUlNWUCcgOiAnVXBkYXRlIG15IFJTVlAnO1xuXHRcdFx0XHRldmVudC5zaG93RXZlbnREb3dubG9hZCA9IGV2ZW50LnJzdnBPYmogJiYgZXZlbnQucnN2cE9iai5hdHRlbmRpbmc7XG5cdFx0XHRcdGV2ZW50LmNyZWF0ZU9yVXBkYXRlID0gZXZlbnQubm9Sc3ZwID8gJ2NyZWF0ZScgOiAndXBkYXRlJztcblx0XHRcdFx0ZXZlbnQucnN2cFJlYWR5ID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0cnN2cHMuJGxvYWRlZCgpLnRoZW4oX3JzdnBzTG9hZGVkU3VjY2Vzcyk7XG5cdFx0fVxuXG5cdFx0X2dldFVzZXJSc3ZwKCk7XG5cblx0XHQvLyB3aGVuIFJTVlAgaGFzIGJlZW4gc3VibWl0dGVkLCB1cGRhdGUgdXNlciBkYXRhXG5cdFx0JHJvb3RTY29wZS4kb24oJ3JzdnBTdWJtaXR0ZWQnLCBfZ2V0VXNlclJzdnApO1xuXG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgLmljcyBmaWxlIGZvciB0aGlzIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZW5lcmF0ZUljYWwoKSB7XG5cdFx0XHRldmVudC5jYWwgPSBpY3MoKTtcblxuXHRcdFx0dmFyIF9zdGFydEQgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGV2ZW50LmRldGFpbC5zdGFydERhdGUsIGV2ZW50LmRldGFpbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRfZW5kRCA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZlbnQuZGV0YWlsLmVuZERhdGUsIGV2ZW50LmRldGFpbC5lbmRUaW1lKTtcblxuXHRcdFx0ZXZlbnQuY2FsLmFkZEV2ZW50KGV2ZW50LmRldGFpbC50aXRsZSwgZXZlbnQuZGV0YWlsLmRlc2NyaXB0aW9uLCBldmVudC5kZXRhaWwubG9jYXRpb24sIF9zdGFydEQsIF9lbmREKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEb3dubG9hZCAuaWNzIGZpbGVcblx0XHQgKi9cblx0XHRldmVudC5kb3dubG9hZEljcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZXZlbnQuY2FsLmRvd25sb2FkKCk7XG5cdFx0fTtcblxuXHRcdHZhciBldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBzaW5nbGUgZXZlbnQgZGV0YWlsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7b2JqZWN0fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0ZXZlbnQuZGV0YWlsID0gZXZlbnRzLiRnZXRSZWNvcmQoX2V2ZW50SWQpO1xuXHRcdFx0ZXZlbnQuZGV0YWlsLnByZXR0eURhdGUgPSBFdmVudC5nZXRQcmV0dHlEYXRldGltZShldmVudC5kZXRhaWwpO1xuXHRcdFx0ZXZlbnQuZGV0YWlsLmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKGV2ZW50LmRldGFpbCk7XG5cdFx0XHRldmVudC5ldmVudFJlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRldmVudHMuJGxvYWRlZChfZXZlbnRTdWNjZXNzKTtcblxuXHRcdHZhciBfd2F0Y2hSc3ZwUmVhZHkgPSAkc2NvcGUuJHdhdGNoKCdldmVudC5yc3ZwUmVhZHknLCBmdW5jdGlvbihuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0aWYgKG5ld1ZhbCAmJiBldmVudC5kZXRhaWwgJiYgZXZlbnQuZGV0YWlsLnJzdnApIHtcblx0XHRcdFx0X2dlbmVyYXRlSWNhbCgpO1xuXHRcdFx0XHRfd2F0Y2hSc3ZwUmVhZHkoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3JzdnBGb3JtJywgcnN2cEZvcm0pO1xuXG5cdHJzdnBGb3JtLiRpbmplY3QgPSBbJ0ZpcmUnLCAnJHRpbWVvdXQnLCAnJHJvb3RTY29wZSddO1xuXG5cdGZ1bmN0aW9uIHJzdnBGb3JtKEZpcmUsICR0aW1lb3V0LCAkcm9vdFNjb3BlKSB7XG5cblx0XHRyc3ZwRm9ybUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHRmdW5jdGlvbiByc3ZwRm9ybUN0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgcmYgPSB0aGlzO1xuXG5cdFx0XHQvLyBjaGVjayBpZiBmb3JtIGlzIGNyZWF0ZSBvciBlZGl0IChkb2VzIHRoZSBtb2RlbCBhbHJlYWR5IGV4aXN0IG9yIG5vdClcblx0XHRcdHZhciBfaXNDcmVhdGUgPSAhIXJmLmZvcm1Nb2RlbElkID09PSBmYWxzZSxcblx0XHRcdFx0X2lzRWRpdCA9ICEhcmYuZm9ybU1vZGVsSWQgPT09IHRydWU7XG5cblx0XHRcdHZhciByc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0cmYubnVtYmVyUmVnZXggPSAvXihbMS05XXwxMCkkLztcblxuXHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRyZi5mb3JtTW9kZWwgPSB7XG5cdFx0XHRcdFx0dXNlcklkOiByZi51c2VySWQsXG5cdFx0XHRcdFx0ZXZlbnROYW1lOiByZi5ldmVudC50aXRsZSxcblx0XHRcdFx0XHRldmVudElkOiByZi5ldmVudC4kaWQsXG5cdFx0XHRcdFx0bmFtZTogcmYudXNlck5hbWVcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0cnN2cHMuJGxvYWRlZChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmYuZm9ybU1vZGVsID0gcnN2cHMuJGdldFJlY29yZChyZi5mb3JtTW9kZWxJZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFdyYXAgJHdhdGNoIGluIGEgZnVuY3Rpb24gc28gdGhhdCBpdCBjYW4gYmUgcmUtaW5pdGlhbGl6ZWQgYWZ0ZXIgaXQncyBiZWVuIGRlcmVnaXN0ZXJlZFxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfc3RhcnRXYXRjaEF0dGVuZGluZygpIHtcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFdhdGNoIHVzZXIncyBhdHRlbmRpbmcgaW5wdXQgYW5kIGlmIHRydWUsIHNldCBkZWZhdWx0IG51bWJlciBvZiBndWVzdHMgdG8gMVxuXHRcdFx0XHQgKlxuXHRcdFx0XHQgKiBAdHlwZSB7KnxmdW5jdGlvbigpfVxuXHRcdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0XHQgKi9cblx0XHRcdFx0dmFyIF93YXRjaEF0dGVuZGluZyA9ICRzY29wZS4kd2F0Y2goJ3JmLmZvcm1Nb2RlbC5hdHRlbmRpbmcnLCBmdW5jdGlvbiAobmV3VmFsLCBvbGRWYWwpIHtcblx0XHRcdFx0XHRpZiAobmV3VmFsID09PSB0cnVlICYmICFvbGRWYWwgJiYgIXJmLmZvcm1Nb2RlbC5ndWVzdHMpIHtcblx0XHRcdFx0XHRcdHJmLmZvcm1Nb2RlbC5ndWVzdHMgPSAxO1xuXG5cdFx0XHRcdFx0XHQvLyBkZXJlZ2lzdGVyICR3YXRjaFxuXHRcdFx0XHRcdFx0X3dhdGNoQXR0ZW5kaW5nKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RhcnQgd2F0Y2hpbmcgcmYuZm9ybU1vZGVsLmF0dGVuZGluZ1xuXHRcdFx0X3N0YXJ0V2F0Y2hBdHRlbmRpbmcoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXNldCB0aGUgc3RhdGUgb2YgdGhlIGZvcm0gU3VibWl0IGJ1dHRvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9idG5TdWJtaXRSZXNldCgpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSBmYWxzZTtcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTdWJtaXQgUlNWUCcgOiAnVXBkYXRlIFJTVlAnO1xuXHRcdFx0fVxuXG5cdFx0XHRfYnRuU3VibWl0UmVzZXQoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgUlNWUCBBUEkgY2FsbCBzdWNjZWVkZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfcnN2cFN1Y2Nlc3MoKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gdHJ1ZTtcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTdWJtaXR0ZWQhJyA6ICdVcGRhdGVkISc7XG5cblx0XHRcdFx0JHJvb3RTY29wZS4kYnJvYWRjYXN0KCdyc3ZwU3VibWl0dGVkJyk7XG5cblx0XHRcdFx0Ly8gdXNlciBoYXMgc3VibWl0dGVkIGFuIFJTVlA7IHVwZGF0ZSBjcmVhdGUvZWRpdCBzdGF0dXMgaW4gY2FzZSB0aGV5IGVkaXQgd2l0aG91dCByZWZyZXNoaW5nXG5cdFx0XHRcdF9pc0NyZWF0ZSA9IGZhbHNlO1xuXHRcdFx0XHRfaXNFZGl0ID0gdHJ1ZTtcblxuXHRcdFx0XHQvLyByZXN0YXJ0ICR3YXRjaCBvbiByZi5mb3JtTW9kZWwuYXR0ZW5kaW5nXG5cdFx0XHRcdF9zdGFydFdhdGNoQXR0ZW5kaW5nKCk7XG5cblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0X2J0blN1Ym1pdFJlc2V0KCk7XG5cdFx0XHRcdFx0cmYuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBSU1ZQIEFQSSBjYWxsIGVycm9yXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBFcnJvcihlcnIpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSAnZXJyb3InO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ0Vycm9yIHN1Ym1pdHRpbmchJyA6ICdFcnJvciB1cGRhdGluZyEnO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKHJmLmJ0blN1Ym1pdFRleHQsIGVycik7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBzdWJtaXQgYnV0dG9uXG5cdFx0XHQgKiBTdWJtaXQgUlNWUCB0byBBUElcblx0XHRcdCAqIEZvcm0gQCByc3ZwRm9ybS50cGwuaHRtbFxuXHRcdFx0ICovXG5cdFx0XHRyZi5zdWJtaXRSc3ZwID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJmLmJ0blN1Ym1pdFRleHQgPSAnU2VuZGluZy4uLic7XG5cblx0XHRcdFx0aWYgKCFyZi5mb3JtTW9kZWwuYXR0ZW5kaW5nKSB7XG5cdFx0XHRcdFx0cmYuZm9ybU1vZGVsLmd1ZXN0cyA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0cnN2cHMuJGFkZChyZi5mb3JtTW9kZWwpLnRoZW4oX3JzdnBTdWNjZXNzLCBfcnN2cEVycm9yKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHRyc3Zwcy4kc2F2ZShyZi5mb3JtTW9kZWwpLnRoZW4oX3JzdnBTdWNjZXNzLCBfcnN2cEVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBmdW5jdGlvbiB0byBjbG9zZSB0aGUgbW9kYWwgd2luZG93XG5cdFx0XHQgKi9cblx0XHRcdHJmLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmYuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZXZlbnQ6ICc9Jyxcblx0XHRcdFx0dXNlck5hbWU6ICdAJyxcblx0XHRcdFx0dXNlcklkOiAnQCcsXG5cdFx0XHRcdGZvcm1Nb2RlbElkOiAnQCcsXG5cdFx0XHRcdHNob3dNb2RhbDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICcvbmctYXBwL2V2ZW50LWRldGFpbC9yc3ZwRm9ybS50cGwuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiByc3ZwRm9ybUN0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdyZicsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0V2ZW50c0N0cmwnLCBFdmVudHNDdHJsKTtcblxuXHRFdmVudHNDdHJsLiRpbmplY3QgPSBbJ0ZpcmUnLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBFdmVudHNDdHJsKEZpcmUsIEV2ZW50KSB7XG5cdFx0dmFyIGV2ZW50cyA9IHRoaXM7XG5cblx0XHRldmVudHMuYWxsRXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdC8vIHN5bmNocm9ub3VzbHkgcmV0cmlldmUgdXNlciBkYXRhXG5cdFx0ZXZlbnRzLnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIGV2ZW50cyBsaXN0XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7QXJyYXl9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2V2ZW50c1N1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMuYWxsRXZlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciB0aGlzRXZ0ID0gZXZlbnRzLmFsbEV2ZW50c1tpXTtcblxuXHRcdFx0XHR0aGlzRXZ0LnN0YXJ0RGF0ZUpTID0gRXZlbnQuZ2V0SlNEYXRldGltZSh0aGlzRXZ0LnN0YXJ0RGF0ZSwgdGhpc0V2dC5zdGFydFRpbWUpO1xuXHRcdFx0XHR0aGlzRXZ0LmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKHRoaXNFdnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRldmVudHMuZXZlbnRzUmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50cy5hbGxFdmVudHMuJGxvYWRlZCgpLnRoZW4oX2V2ZW50c1N1Y2Nlc3MpO1xuXG5cdFx0LyoqXG5cdFx0ICogQ3VzdG9tIHNvcnQgZnVuY3Rpb25cblx0XHQgKiBHZXQgZXZlbnQgc3RhcnQgZGF0ZSBhbmQgY2hhbmdlIHRvIHJlYWwgZGF0ZSB0byBzb3J0IGJ5XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZ0IHtvYmplY3R9IGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtEYXRlfVxuXHRcdCAqL1xuXHRcdGV2ZW50cy5zb3J0U3RhcnREYXRlID0gZnVuY3Rpb24oZXZ0KSB7XG5cdFx0XHRyZXR1cm4gRXZlbnQuZ2V0SlNEYXRldGltZShldnQuc3RhcnREYXRlLCBldnQuc3RhcnRUaW1lKTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZpbHRlcigncHJldHR5RGF0ZScsIHByZXR0eURhdGUpO1xuXG5cdGZ1bmN0aW9uIHByZXR0eURhdGUoKSB7XG5cdFx0LyoqXG5cdFx0ICogVGFrZXMgYSBkYXRlIHN0cmluZyBhbmQgY29udmVydHMgaXQgdG8gYSBwcmV0dHkgZGF0ZVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGVTdHIge3N0cmluZ31cblx0XHQgKi9cblx0XHRyZXR1cm4gZnVuY3Rpb24gKGRhdGVTdHIpIHtcblx0XHRcdHZhciBkID0gbmV3IERhdGUoZGF0ZVN0ciksXG5cdFx0XHRcdG1vbnRoc0FyciA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXSxcblx0XHRcdFx0bW9udGggPSBtb250aHNBcnJbZC5nZXRNb250aCgpXSxcblx0XHRcdFx0ZGF5ID0gZC5nZXREYXRlKCksXG5cdFx0XHRcdHllYXIgPSBkLmdldEZ1bGxZZWFyKCksXG5cdFx0XHRcdHByZXR0eURhdGU7XG5cblx0XHRcdHByZXR0eURhdGUgPSBtb250aCArICcgJyArIGRheSArICcsICcgKyB5ZWFyO1xuXG5cdFx0XHRyZXR1cm4gcHJldHR5RGF0ZTtcblx0XHR9O1xuXHR9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxyXG5cdFx0LmNvbnRyb2xsZXIoJ0hlYWRlckN0cmwnLCBoZWFkZXJDdHJsKTtcclxuXHJcblx0aGVhZGVyQ3RybC4kaW5qZWN0ID0gWyckbG9jYXRpb24nLCAnbG9jYWxEYXRhJywgJ0ZpcmUnLCAnJHJvb3RTY29wZSddO1xyXG5cclxuXHRmdW5jdGlvbiBoZWFkZXJDdHJsKCRsb2NhdGlvbiwgbG9jYWxEYXRhLCBGaXJlLCAkcm9vdFNjb3BlKSB7XHJcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXHJcblx0XHR2YXIgaGVhZGVyID0gdGhpcztcclxuXHJcblx0XHQvLyBhdXRoZW50aWNhdGlvbiBjb250cm9sc1xyXG5cdFx0dmFyIF9hdXRoID0gRmlyZS5hdXRoKCk7XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBHZXQgdGhlIGxvY2FsIGRhdGEgZnJvbSBKU09OXHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIGRhdGFcclxuXHRcdCAqIEBwcml2YXRlXHJcblx0XHQgKi9cclxuXHRcdGZ1bmN0aW9uIF9sb2NhbERhdGFTdWNjZXNzKGRhdGEpIHtcclxuXHRcdFx0aGVhZGVyLmxvY2FsRGF0YSA9IGRhdGE7XHJcblx0XHR9XHJcblxyXG5cdFx0bG9jYWxEYXRhLmdldEpTT04oKS50aGVuKF9sb2NhbERhdGFTdWNjZXNzKTtcclxuXHJcblx0XHQvLyBnZXQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZVxyXG5cdFx0aGVhZGVyLmRhdGEgPSBGaXJlLmRhdGEoKTtcclxuXHRcdGhlYWRlci51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogU3VjY2VzcyBmdW5jdGlvbiBmcm9tIGF1dGhlbnRpY2F0aW5nXHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIGF1dGhEYXRhIHtvYmplY3R9XHJcblx0XHQgKi9cclxuXHRcdGZ1bmN0aW9uIF9vbkF1dGhDYihhdXRoRGF0YSkge1xyXG5cdFx0XHRoZWFkZXIudXNlciA9IGF1dGhEYXRhO1xyXG5cclxuXHRcdFx0aWYgKCFhdXRoRGF0YSkge1xyXG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIG9uIGxvZ2luIG9yIGxvZ291dFxyXG5cdFx0X2F1dGguJG9uQXV0aChfb25BdXRoQ2IpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogTG9nIHRoZSB1c2VyIG91dCBvZiB3aGF0ZXZlciBhdXRoZW50aWNhdGlvbiB0aGV5J3ZlIHNpZ25lZCBpbiB3aXRoXHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0X2F1dGguJHVuYXV0aCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEN1cnJlbnRseSBhY3RpdmUgbmF2IGl0ZW0gd2hlbiAnLycgaW5kZXhcclxuXHRcdCAqXHJcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5pbmRleElzQWN0aXZlID0gZnVuY3Rpb24ocGF0aCkge1xyXG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSAnLydcclxuXHRcdFx0cmV0dXJuICRsb2NhdGlvbi5wYXRoKCkgPT09IHBhdGg7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ3VycmVudGx5IGFjdGl2ZSBuYXYgaXRlbVxyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXHJcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuXHRcdCAqL1xyXG5cdFx0aGVhZGVyLm5hdklzQWN0aXZlID0gZnVuY3Rpb24ocGF0aCkge1xyXG5cdFx0XHRyZXR1cm4gJGxvY2F0aW9uLnBhdGgoKS5zdWJzdHIoMCwgcGF0aC5sZW5ndGgpID09PSBwYXRoO1xyXG5cdFx0fTtcclxuXHR9XHJcblxyXG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnbmF2Q29udHJvbCcsIG5hdkNvbnRyb2wpO1xuXG5cdG5hdkNvbnRyb2wuJGluamVjdCA9IFsnbWVkaWFDaGVjaycsICdNUScsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIG5hdkNvbnRyb2wobWVkaWFDaGVjaywgTVEsICR0aW1lb3V0KSB7XG5cblx0XHRuYXZDb250cm9sTGluay4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGVsZW1lbnQnLCAnJGF0dHJzJ107XG5cblx0XHRmdW5jdGlvbiBuYXZDb250cm9sTGluaygkc2NvcGUpIHtcblx0XHRcdC8vIGRhdGEgb2JqZWN0XG5cdFx0XHQkc2NvcGUubmF2ID0ge307XG5cblx0XHRcdHZhciBfYm9keSA9IGFuZ3VsYXIuZWxlbWVudCgnYm9keScpLFxuXHRcdFx0XHRfbmF2T3BlbjtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBPcGVuIG1vYmlsZSBuYXZpZ2F0aW9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX29wZW5OYXYoKSB7XG5cdFx0XHRcdF9ib2R5XG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCduYXYtY2xvc2VkJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25hdi1vcGVuJyk7XG5cblx0XHRcdFx0X25hdk9wZW4gPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIENsb3NlIG1vYmlsZSBuYXZpZ2F0aW9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2Nsb3NlTmF2KCkge1xuXHRcdFx0XHRfYm9keVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnbmF2LW9wZW4nKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnbmF2LWNsb3NlZCcpO1xuXG5cdFx0XHRcdF9uYXZPcGVuID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGVudGVyaW5nIG1vYmlsZSBtZWRpYSBxdWVyeVxuXHRcdFx0ICogQ2xvc2UgbmF2IGFuZCBzZXQgdXAgbWVudSB0b2dnbGluZyBmdW5jdGlvbmFsaXR5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2VudGVyTW9iaWxlKCkge1xuXHRcdFx0XHRfY2xvc2VOYXYoKTtcblxuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogVG9nZ2xlIG1vYmlsZSBuYXZpZ2F0aW9uIG9wZW4vY2xvc2VkXG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0JHNjb3BlLm5hdi50b2dnbGVOYXYgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoIV9uYXZPcGVuKSB7XG5cdFx0XHRcdFx0XHRcdF9vcGVuTmF2KCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRfY2xvc2VOYXYoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUuJG9uKCckbG9jYXRpb25DaGFuZ2VTdWNjZXNzJywgX2Nsb3NlTmF2KTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gZXhpdGluZyBtb2JpbGUgbWVkaWEgcXVlcnlcblx0XHRcdCAqIERpc2FibGUgbWVudSB0b2dnbGluZyBhbmQgcmVtb3ZlIGJvZHkgY2xhc3Nlc1xuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9leGl0TW9iaWxlKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLm5hdi50b2dnbGVOYXYgPSBudWxsO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRfYm9keS5yZW1vdmVDbGFzcygnbmF2LWNsb3NlZCBuYXYtb3BlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgZnVuY3Rpb25hbGl0eSB0byBydW4gb24gZW50ZXIvZXhpdCBvZiBtZWRpYSBxdWVyeVxuXHRcdFx0bWVkaWFDaGVjay5pbml0KHtcblx0XHRcdFx0c2NvcGU6ICRzY29wZSxcblx0XHRcdFx0bXE6IE1RLlNNQUxMLFxuXHRcdFx0XHRlbnRlcjogX2VudGVyTW9iaWxlLFxuXHRcdFx0XHRleGl0OiBfZXhpdE1vYmlsZVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogbmF2Q29udHJvbExpbmtcblx0XHR9O1xuXHR9XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBMb2dpbkN0cmwpO1xuXG5cdExvZ2luQ3RybC4kaW5qZWN0ID0gWydGaXJlJywgJ09BVVRIJywgJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJ2xvY2FsRGF0YSddO1xuXG5cdGZ1bmN0aW9uIExvZ2luQ3RybChGaXJlLCBPQVVUSCwgJHJvb3RTY29wZSwgJGxvY2F0aW9uLCBsb2NhbERhdGEpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGxvZ2luID0gdGhpcztcblxuXHRcdC8vIEZpcmViYXNlIGF1dGhlbnRpY2F0aW9uXG5cdFx0dmFyIF9hdXRoID0gRmlyZS5hdXRoKCk7XG5cblx0XHR2YXIgX2xvZ2dlZEluID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0aWYgKF9sb2dnZWRJbikge1xuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBfbG9jYWxEYXRhU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRsb2dpbi5sb2NhbERhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdGxvY2FsRGF0YS5nZXRKU09OKCkudGhlbihfbG9jYWxEYXRhU3VjY2Vzcyk7XG5cblx0XHRsb2dpbi5sb2dpbnMgPSBPQVVUSC5MT0dJTlM7XG5cblx0XHQvKipcblx0XHQgKiBBdXRoZW50aWNhdGUgdGhlIHVzZXIgdmlhIE9hdXRoIHdpdGggdGhlIHNwZWNpZmllZCBwcm92aWRlclxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gKHR3aXR0ZXIsIGZhY2Vib29rLCBnaXRodWIsIGdvb2dsZSlcblx0XHQgKi9cblx0XHRsb2dpbi5hdXRoZW50aWNhdGUgPSBmdW5jdGlvbihwcm92aWRlcikge1xuXHRcdFx0bG9naW4ubG9nZ2luZ0luID0gdHJ1ZTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBTdWNjZXNzZnVsbHkgYXV0aGVudGljYXRlZFxuXHRcdFx0ICogR28gdG8gaW5pdGlhbGx5IGludGVuZGVkIGF1dGhlbnRpY2F0ZWQgcGF0aFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSByZXNwb25zZSB7b2JqZWN0fSBwcm9taXNlIHJlc3BvbnNlXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXV0aFN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0bG9naW4ubG9nZ2luZ0luID0gZmFsc2U7XG5cblx0XHRcdFx0aWYgKCRyb290U2NvcGUuYXV0aFBhdGgpIHtcblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgkcm9vdFNjb3BlLmF1dGhQYXRoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnLycpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdF9hdXRoLiRhdXRoV2l0aE9BdXRoUG9wdXAocHJvdmlkZXIpXG5cdFx0XHRcdC50aGVuKF9hdXRoU3VjY2Vzcylcblx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2cocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0bG9naW4ubG9nZ2luZ0luID0gJ2Vycm9yJztcblx0XHRcdFx0XHRsb2dpbi5sb2dpbk1zZyA9ICcnXG5cdFx0XHRcdH0pO1xuXHRcdH07XG5cdH1cbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9