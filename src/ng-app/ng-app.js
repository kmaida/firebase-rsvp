angular
	.module('myApp', ['firebase', 'ngRoute', 'ngResource', 'ngSanitize', 'ngMessages', 'mediaCheck', 'ui.bootstrap']);
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('AccountCtrl', AccountCtrl);

	AccountCtrl.$inject = ['$scope', '$location', '$auth', 'userData', '$timeout', 'OAUTH', 'User'];

	function AccountCtrl($scope, $location, $auth, userData, $timeout, OAUTH, User) {
		// controllerAs ViewModel
		var account = this;

		// All available login services
		account.logins = OAUTH.LOGINS;

		/**
		 * Is the user authenticated?
		 *
		 * @returns {boolean}
		 */
		account.isAuthenticated = function() {
			return $auth.isAuthenticated();
		};

		var _tab = $location.search().view;

		account.tabs = [
			{
				name: 'User Info',
				query: 'user-info'
			},
			{
				name: 'Manage Logins',
				query: 'manage-logins'
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

		/**
		 * Reset profile save button to initial state
		 *
		 * @private
		 */
		function _btnSaveReset() {
			account.btnSaved = false;
			account.btnSaveText = 'Save';
		}

		_btnSaveReset();

		/**
		 * Watch display name changes to check for empty or null string
		 * Set button text accordingly
		 *
		 * @param newVal {string} updated displayName value from input field
		 * @param oldVal {*} previous displayName value
		 * @private
		 */
		function _watchDisplayName(newVal, oldVal) {
			if (newVal === '' || newVal === null) {
				account.btnSaveText = 'Enter Name';
			} else {
				account.btnSaveText = 'Save';
			}
		}
		$scope.$watch('account.user.displayName', _watchDisplayName);

		/**
		 * Update user's profile information
		 * Called on submission of update form
		 */
		account.updateProfile = function() {
			var profileData = { displayName: account.user.displayName };

			/**
			 * Success callback when profile has been updated
			 *
			 * @private
			 */
			function _updateSuccess() {
				account.btnSaved = true;
				account.btnSaveText = 'Saved!';

				$timeout(_btnSaveReset, 2500);
			}

			/**
			 * Error callback when profile update has failed
			 *
			 * @private
			 */
			function _updateError() {
				account.btnSaved = 'error';
				account.btnSaveText = 'Error saving!';

				$timeout(_btnSaveReset, 3000);
			}

			if (!!account.user.displayName) {
				// Set status to Saving... and update upon success or error in callbacks
				account.btnSaveText = 'Saving...';

				// Update the user, passing profile data and assigning success and error callbacks
				userData.updateUser(profileData).then(_updateSuccess, _updateError);
			}
		};

		/**
		 * Link third-party provider
		 *
		 * @param {string} provider
		 */
		account.link = function(provider) {
			$auth.link(provider)
				.then(function() {
					account.getProfile();
				})
				.catch(function(response) {
					alert(response.data.message);
				});
		};

		/**
		 * Unlink third-party provider
		 *
		 * @param {string} provider
		 */
		account.unlink = function(provider) {
			$auth.unlink(provider)
				.then(function() {
					account.getProfile();
				})
				.catch(function(response) {
					alert(response.data ? response.data.message : 'Could not unlink ' + provider + ' account');
				});
		};

		account.getProfile();
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
		 * Function for successful API call getting all events
		 * Show Admin Events UI
		 * Display list of events
		 *
		 * @param data {Array} promise provided by $http success
		 * @private
		 */
		function _getAllEventsSuccess(data) {
			console.log(aEvt.events);

			aEvt.eventsReady = true;
		}

		aEvt.events.$loaded(_getAllEventsSuccess);

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

	EditEventCtrl.$inject = ['$auth', 'userData', 'eventData', '$routeParams', '$location', '$timeout'];

	function EditEventCtrl($auth, userData, eventData, $routeParams, $location, $timeout) {
		// controllerAs ViewModel
		var edit = this;

		// get the event ID
		var _eventId = $routeParams.eventId;

		// tabs
		edit.tabs = ['Update Details', 'Delete Event'];
		edit.currentTab = 0;

		edit.changeTab = function(index) {
			edit.currentTab = index;
		};

		// verify that user is admin
		userData.getUser().then(function(data) {
			edit.showEdit = data.isAdmin ? true : false;
		});

		/**
		 * Determines if the user is authenticated
		 *
		 * @returns {boolean}
		 */
		edit.isAuthenticated = function() {
			return $auth.isAuthenticated();
		};

		/**
		 * Function returned on successful API call for this event
		 *
		 * @param data {object} event data
		 * @private
		 */
		function _getEventSuccess(data) {
			edit.editEvent = data;
			edit.showEditForm = true;
		}

		eventData.getEvent(_eventId).then(_getEventSuccess);

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

			eventData.deleteEvent(_eventId).then(_deleteSuccess, _deleteError);
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('eventForm', eventForm);

	eventForm.$inject = ['Fire', 'Utils', '$timeout', '$location', '$filter', 'Event'];

	function eventForm(Fire, Utils, $timeout, $location, $filter, Event) {

		eventFormCtrl.$inject = ['$scope'];

		function eventFormCtrl($scope) {
			// controllerAs syntax
			var ef = this;

			// check if form is create or edit
			var _isCreate = jQuery.isEmptyObject(ef.prefillModel),
				_isEdit = !jQuery.isEmptyObject(ef.prefillModel);

			var events = Fire.events();

			ef.timeRegex = /^(0?[1-9]|1[012])(:[0-5]\d) [APap][mM]$/i;

			if (_isEdit) {
				ef.formModel = ef.prefillModel;
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
			 * On start date valid blur, update end date if empty
			 */
			ef.startDateBlur = function() {
				if (ef.formModel && ef.formModel.startDate && !ef.formModel.endDate) {
					ef.formModel.endDate = $filter('date')(ef.formModel.startDate, 'MM/dd/yyyy');
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
				console.log('added record with id ', ref.key());

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
				if (_isCreate) {
					events.$add(ef.formModel).then(_eventSuccess, _eventError);

				} else if (_isEdit) {
					// TODO: how to edit an existing event?
					//eventData.updateEvent(ef.formModel._id, ef.formModel).then(_eventSuccess, _eventError);
				}
			};
		}

		return {
			restrict: 'EA',
			scope: {
				prefillModel: '='
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

		function events() {
			var _ref = new Firebase(uri + 'events');
			return $firebaseArray(_ref);
		}

		return {
			uri: uri,
			ref: ref,
			auth: auth,
			data: data,
			events: events
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

		/**
		 * Generate a unique GUID-like ID
		 *
		 * @returns {string}
		 */
		function generateId() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
		}

		return {
			getOrdinal: getOrdinal,
			generateId: generateId
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

	EventDetailCtrl.$inject = ['$scope', '$routeParams', '$auth', 'userData', 'eventData', '$rootScope', 'Event'];

	function EventDetailCtrl($scope, $routeParams, $auth, userData, eventData, $rootScope, Event) {
		var event = this,
			_eventId = $routeParams.eventId;

		/**
		 * Determines if the user is authenticated
		 *
		 * @returns {boolean}
		 */
		event.isAuthenticated = function() {
			return $auth.isAuthenticated();
		};

		event.showModal = false;

		event.openRsvpModal = function() {
			event.showModal = true;
		};

		/**
		 * Fetch the user's data and process RSVP information
		 *
		 * @private
		 */
		function _getUserData() {

			/**
			 * Function for successful API call retrieving user data
			 * Check if user is admin
			 * Then calls RSVP data and determines if user has RSVPed to this event
			 *
			 * @param data {object} promise provided by $http success
			 * @private
			 */
			function _userSuccess(data) {
				event.user = data;
				event.isAdmin = data.isAdmin;

				var _rsvps = event.user.rsvps;

				for (var i = 0; i < _rsvps.length; i++) {
					var thisRsvp = _rsvps[i];

					if (thisRsvp.eventId === _eventId) {
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

			userData.getUser().then(_userSuccess);
		}

		_getUserData();

		// when RSVP has been submitted, update user data
		$rootScope.$on('rsvpSubmitted', _getUserData);

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

		/**
		 * Function for successful API call getting single event detail
		 *
		 * @param data {object} promise provided by $http success
		 * @private
		 */
		function _eventSuccess(data) {
			event.detail = data;
			event.detail.prettyDate = Event.getPrettyDatetime(event.detail);
			event.detail.expired = Event.expired(event.detail);
			event.eventReady = true;
		}

		eventData.getEvent(_eventId).then(_eventSuccess);

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

	rsvpForm.$inject = ['rsvpData', '$timeout', '$rootScope'];

	function rsvpForm(rsvpData, $timeout, $rootScope) {

		rsvpFormCtrl.$inject = ['$scope'];

		function rsvpFormCtrl($scope) {
			// controllerAs syntax
			var rf = this;

			// check if form is create or edit (does the model already exist or not)
			var _isCreate = !rf.formModel,
				_isEdit = !!rf.formModel;

			rf.numberRegex = /^([1-9]|10)$/;

			if (_isCreate && rf.userName) {
				rf.formModel = {
					userId: rf.userId,
					eventName: rf.event.title,
					name: rf.userName
				};
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
			function _rsvpError() {
				rf.btnSaved = 'error';
				rf.btnSubmitText = _isCreate ? 'Error submitting!' : 'Error updating!';

				$timeout(_btnSubmitReset, 3000);
			}

			/**
			 * Click submit button
			 * Submit RSVP to API
			 * Form @ rsvpForm.tpl.html
			 */
			rf.submitRsvp = function() {
				rf.btnSubmitText = 'Sending...';

				if (_isCreate) {
					rsvpData.createRsvp(rf.event._id, rf.formModel).then(_rsvpSuccess, _rsvpError);

				} else if (_isEdit) {
					rsvpData.updateRsvp(rf.formModel._id, rf.formModel).then(_rsvpSuccess, _rsvpError);
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
				formModel: '=',
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

		var _auth = Fire.auth();

		_auth.$onAuth(function(authData) {
			events.isAuthenticated = !!authData;
		});

		/**
		 * Function for successful API call getting events list
		 *
		 * @param data {Array} promise provided by $http success
		 * @private
		 */
		function _eventsSuccess(data) {
			events.allEvents = data;

			for (var i = 0; i < events.allEvents.length; i++) {
				var thisEvt = events.allEvents[i];

				thisEvt.startDateJS = Event.getJSDatetime(thisEvt.startDate, thisEvt.startTime);
				thisEvt.expired = Event.expired(thisEvt);
			}

			events.eventsReady = true;
		}

		eventData.getAllEvents().then(_eventsSuccess);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUuanMiLCJhY2NvdW50L0FjY291bnQuY3RybC5qcyIsImFkbWluL0FkbWluLmN0cmwuanMiLCJhZG1pbi9BZG1pbkV2ZW50TGlzdC5jdHJsLmpzIiwiYWRtaW4vRWRpdEV2ZW50LmN0cmwuanMiLCJhZG1pbi9ldmVudEZvcm0uZGlyLmpzIiwiYWRtaW4vdmFsaWRhdGVEYXRlRnV0dXJlLmRpci5qcyIsImFkbWluL3ZpZXdFdmVudEd1ZXN0cy5kaXIuanMiLCJjb3JlL0V2ZW50LmZhY3RvcnkuanMiLCJjb3JlL0ZpcmUuZmFjdG9yeS5qcyIsImNvcmUvTVEuY29uc3RhbnQuanMiLCJjb3JlL09BVVRILmNvbnN0YW50LmpzIiwiY29yZS9VdGlscy5mYWN0b3J5LmpzIiwiY29yZS9hcHAuYXV0aC5qcyIsImNvcmUvYXBwLmNvbmZpZy5qcyIsImNvcmUvZGV0ZWN0QWRCbG9jay5kaXIuanMiLCJjb3JlL2V2ZW50RGF0YS5zZXJ2aWNlLmpzIiwiY29yZS9sb2NhbERhdGEuc2VydmljZS5qcyIsImNvcmUvbWVkaWFDaGVjay5zZXJ2aWNlLmpzIiwiY29yZS9yc3ZwRGF0YS5zZXJ2aWNlLmpzIiwiY29yZS90cnVzdEFzSFRNTC5maWx0ZXIuanMiLCJjb3JlL3ZpZXdTd2l0Y2guZGlyLmpzIiwiZXZlbnQtZGV0YWlsL0V2ZW50RGV0YWlsLmN0cmwuanMiLCJldmVudC1kZXRhaWwvcnN2cEZvcm0uZGlyLmpzIiwiZXZlbnRzL0V2ZW50cy5jdHJsLmpzIiwiZXZlbnRzL3ByZXR0eURhdGUuZmlsdGVyLmpzIiwiaGVhZGVyL0hlYWRlci5jdHJsLmpzIiwiaGVhZGVyL25hdkNvbnRyb2wuZGlyLmpzIiwibG9naW4vTG9naW4uY3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJuZy1hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyXG5cdC5tb2R1bGUoJ215QXBwJywgWydmaXJlYmFzZScsICduZ1JvdXRlJywgJ25nUmVzb3VyY2UnLCAnbmdTYW5pdGl6ZScsICduZ01lc3NhZ2VzJywgJ21lZGlhQ2hlY2snLCAndWkuYm9vdHN0cmFwJ10pOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FjY291bnRDdHJsJywgQWNjb3VudEN0cmwpO1xuXG5cdEFjY291bnRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nLCAnJGF1dGgnLCAndXNlckRhdGEnLCAnJHRpbWVvdXQnLCAnT0FVVEgnLCAnVXNlciddO1xuXG5cdGZ1bmN0aW9uIEFjY291bnRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCAkYXV0aCwgdXNlckRhdGEsICR0aW1lb3V0LCBPQVVUSCwgVXNlcikge1xuXHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHR2YXIgYWNjb3VudCA9IHRoaXM7XG5cblx0XHQvLyBBbGwgYXZhaWxhYmxlIGxvZ2luIHNlcnZpY2VzXG5cdFx0YWNjb3VudC5sb2dpbnMgPSBPQVVUSC5MT0dJTlM7XG5cblx0XHQvKipcblx0XHQgKiBJcyB0aGUgdXNlciBhdXRoZW50aWNhdGVkP1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0YWNjb3VudC5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkYXV0aC5pc0F1dGhlbnRpY2F0ZWQoKTtcblx0XHR9O1xuXG5cdFx0dmFyIF90YWIgPSAkbG9jYXRpb24uc2VhcmNoKCkudmlldztcblxuXHRcdGFjY291bnQudGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1VzZXIgSW5mbycsXG5cdFx0XHRcdHF1ZXJ5OiAndXNlci1pbmZvJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ01hbmFnZSBMb2dpbnMnLFxuXHRcdFx0XHRxdWVyeTogJ21hbmFnZS1sb2dpbnMnXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnUlNWUHMnLFxuXHRcdFx0XHRxdWVyeTogJ3JzdnBzJ1xuXHRcdFx0fVxuXHRcdF07XG5cblx0XHRhY2NvdW50LmN1cnJlbnRUYWIgPSBfdGFiID8gX3RhYiA6ICd1c2VyLWluZm8nO1xuXG5cdFx0LyoqXG5cdFx0ICogQ2hhbmdlIHRhYnMgYnkgd2F0Y2hpbmcgZm9yIHJvdXRlIHVwZGF0ZVxuXHRcdCAqL1xuXHRcdCRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0KSB7XG5cdFx0XHRhY2NvdW50LmN1cnJlbnRUYWIgPSBuZXh0LnBhcmFtcy52aWV3IHx8ICd1c2VyLWluZm8nO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0ICogR2V0IHVzZXIncyBwcm9maWxlIGluZm9ybWF0aW9uXG5cdFx0ICovXG5cdFx0YWNjb3VudC5nZXRQcm9maWxlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgdXNlcidzIHByb2ZpbGUgZGF0YVxuXHRcdFx0ICogU2hvdyBBY2NvdW50IFVJXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gcHJvbWlzZSBwcm92aWRlZCBieSAkaHR0cCBzdWNjZXNzXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZ2V0VXNlclN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0XHRhY2NvdW50LnVzZXIgPSBkYXRhO1xuXHRcdFx0XHRhY2NvdW50LmFkbWluaXN0cmF0b3IgPSBhY2NvdW50LnVzZXIuaXNBZG1pbjtcblx0XHRcdFx0YWNjb3VudC5saW5rZWRBY2NvdW50cyA9IFVzZXIuZ2V0TGlua2VkQWNjb3VudHMoYWNjb3VudC51c2VyLCAnYWNjb3VudCcpO1xuXHRcdFx0XHRhY2NvdW50LnNob3dBY2NvdW50ID0gdHJ1ZTtcblx0XHRcdFx0YWNjb3VudC5yc3ZwcyA9IGFjY291bnQudXNlci5yc3Zwcztcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgZXJyb3IgQVBJIGNhbGwgZ2V0dGluZyB1c2VyJ3MgcHJvZmlsZSBkYXRhXG5cdFx0XHQgKiBTaG93IGFuIGVycm9yIGFsZXJ0IGluIHRoZSBVSVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSBlcnJvclxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldFVzZXJFcnJvcihlcnJvcikge1xuXHRcdFx0XHRhY2NvdW50LmVycm9yR2V0dGluZ1VzZXIgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR1c2VyRGF0YS5nZXRVc2VyKCkudGhlbihfZ2V0VXNlclN1Y2Nlc3MsIF9nZXRVc2VyRXJyb3IpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXNldCBwcm9maWxlIHNhdmUgYnV0dG9uIHRvIGluaXRpYWwgc3RhdGVcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2J0blNhdmVSZXNldCgpIHtcblx0XHRcdGFjY291bnQuYnRuU2F2ZWQgPSBmYWxzZTtcblx0XHRcdGFjY291bnQuYnRuU2F2ZVRleHQgPSAnU2F2ZSc7XG5cdFx0fVxuXG5cdFx0X2J0blNhdmVSZXNldCgpO1xuXG5cdFx0LyoqXG5cdFx0ICogV2F0Y2ggZGlzcGxheSBuYW1lIGNoYW5nZXMgdG8gY2hlY2sgZm9yIGVtcHR5IG9yIG51bGwgc3RyaW5nXG5cdFx0ICogU2V0IGJ1dHRvbiB0ZXh0IGFjY29yZGluZ2x5XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gbmV3VmFsIHtzdHJpbmd9IHVwZGF0ZWQgZGlzcGxheU5hbWUgdmFsdWUgZnJvbSBpbnB1dCBmaWVsZFxuXHRcdCAqIEBwYXJhbSBvbGRWYWwgeyp9IHByZXZpb3VzIGRpc3BsYXlOYW1lIHZhbHVlXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfd2F0Y2hEaXNwbGF5TmFtZShuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0aWYgKG5ld1ZhbCA9PT0gJycgfHwgbmV3VmFsID09PSBudWxsKSB7XG5cdFx0XHRcdGFjY291bnQuYnRuU2F2ZVRleHQgPSAnRW50ZXIgTmFtZSc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhY2NvdW50LmJ0blNhdmVUZXh0ID0gJ1NhdmUnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkc2NvcGUuJHdhdGNoKCdhY2NvdW50LnVzZXIuZGlzcGxheU5hbWUnLCBfd2F0Y2hEaXNwbGF5TmFtZSk7XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGUgdXNlcidzIHByb2ZpbGUgaW5mb3JtYXRpb25cblx0XHQgKiBDYWxsZWQgb24gc3VibWlzc2lvbiBvZiB1cGRhdGUgZm9ybVxuXHRcdCAqL1xuXHRcdGFjY291bnQudXBkYXRlUHJvZmlsZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHByb2ZpbGVEYXRhID0geyBkaXNwbGF5TmFtZTogYWNjb3VudC51c2VyLmRpc3BsYXlOYW1lIH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogU3VjY2VzcyBjYWxsYmFjayB3aGVuIHByb2ZpbGUgaGFzIGJlZW4gdXBkYXRlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF91cGRhdGVTdWNjZXNzKCkge1xuXHRcdFx0XHRhY2NvdW50LmJ0blNhdmVkID0gdHJ1ZTtcblx0XHRcdFx0YWNjb3VudC5idG5TYXZlVGV4dCA9ICdTYXZlZCEnO1xuXG5cdFx0XHRcdCR0aW1lb3V0KF9idG5TYXZlUmVzZXQsIDI1MDApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEVycm9yIGNhbGxiYWNrIHdoZW4gcHJvZmlsZSB1cGRhdGUgaGFzIGZhaWxlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF91cGRhdGVFcnJvcigpIHtcblx0XHRcdFx0YWNjb3VudC5idG5TYXZlZCA9ICdlcnJvcic7XG5cdFx0XHRcdGFjY291bnQuYnRuU2F2ZVRleHQgPSAnRXJyb3Igc2F2aW5nISc7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blNhdmVSZXNldCwgMzAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghIWFjY291bnQudXNlci5kaXNwbGF5TmFtZSkge1xuXHRcdFx0XHQvLyBTZXQgc3RhdHVzIHRvIFNhdmluZy4uLiBhbmQgdXBkYXRlIHVwb24gc3VjY2VzcyBvciBlcnJvciBpbiBjYWxsYmFja3Ncblx0XHRcdFx0YWNjb3VudC5idG5TYXZlVGV4dCA9ICdTYXZpbmcuLi4nO1xuXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdXNlciwgcGFzc2luZyBwcm9maWxlIGRhdGEgYW5kIGFzc2lnbmluZyBzdWNjZXNzIGFuZCBlcnJvciBjYWxsYmFja3Ncblx0XHRcdFx0dXNlckRhdGEudXBkYXRlVXNlcihwcm9maWxlRGF0YSkudGhlbihfdXBkYXRlU3VjY2VzcywgX3VwZGF0ZUVycm9yKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogTGluayB0aGlyZC1wYXJ0eSBwcm92aWRlclxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyXG5cdFx0ICovXG5cdFx0YWNjb3VudC5saW5rID0gZnVuY3Rpb24ocHJvdmlkZXIpIHtcblx0XHRcdCRhdXRoLmxpbmsocHJvdmlkZXIpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGFjY291bnQuZ2V0UHJvZmlsZSgpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRhbGVydChyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVW5saW5rIHRoaXJkLXBhcnR5IHByb3ZpZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJcblx0XHQgKi9cblx0XHRhY2NvdW50LnVubGluayA9IGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG5cdFx0XHQkYXV0aC51bmxpbmsocHJvdmlkZXIpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGFjY291bnQuZ2V0UHJvZmlsZSgpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRhbGVydChyZXNwb25zZS5kYXRhID8gcmVzcG9uc2UuZGF0YS5tZXNzYWdlIDogJ0NvdWxkIG5vdCB1bmxpbmsgJyArIHByb3ZpZGVyICsgJyBhY2NvdW50Jyk7XG5cdFx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHRhY2NvdW50LmdldFByb2ZpbGUoKTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBBZG1pbkN0cmwpO1xuXG5cdEFkbWluQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgJ0ZpcmUnXTtcblxuXHRmdW5jdGlvbiBBZG1pbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIEZpcmUpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGFkbWluID0gdGhpcztcblxuXHRcdGFkbWluLnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHQvLyBnZXQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZVxuXHRcdGFkbWluLmRhdGEgPSBGaXJlLmRhdGEoKTtcblxuXHRcdHZhciBfdGFiID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZpZXc7XG5cblx0XHRhZG1pbi50YWJzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnRXZlbnRzJyxcblx0XHRcdFx0cXVlcnk6ICdldmVudHMnXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnQWRkIEV2ZW50Jyxcblx0XHRcdFx0cXVlcnk6ICdhZGQtZXZlbnQnXG5cdFx0XHR9XG5cdFx0XTtcblxuXHRcdGFkbWluLmN1cnJlbnRUYWIgPSBfdGFiID8gX3RhYiA6ICdldmVudHMnO1xuXG5cdFx0LyoqXG5cdFx0ICogQ2hhbmdlIHRhYnMgYnkgd2F0Y2hpbmcgZm9yIHJvdXRlIHVwZGF0ZVxuXHRcdCAqL1xuXHRcdCRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0KSB7XG5cdFx0XHRhZG1pbi5jdXJyZW50VGFiID0gbmV4dC5wYXJhbXMudmlldyB8fCAnZXZlbnRzJztcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIFNob3cgUlNWUGVkIGd1ZXN0IG1vZGFsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRJZCB7c3RyaW5nfSBldmVudCBJRCB0byBnZXQgUlNWUHMgZm9yXG5cdFx0ICogQHBhcmFtIGV2ZW50TmFtZSB7c3RyaW5nfSBldmVudCBuYW1lIHRvIGdldCBSU1ZQcyBmb3Jcblx0XHQgKi9cblx0XHRhZG1pbi5zaG93R3Vlc3RzID0gZnVuY3Rpb24oZXZlbnRJZCwgZXZlbnROYW1lKSB7XG5cdFx0XHRhZG1pbi5zaG93R3Vlc3RzRXZlbnRJZCA9IGV2ZW50SWQ7XG5cdFx0XHRhZG1pbi5zaG93R3Vlc3RzRXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdFx0YWRtaW4uc2hvd01vZGFsID0gdHJ1ZTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FkbWluRXZlbnRMaXN0Q3RybCcsIEFkbWluRXZlbnRMaXN0Q3RybCk7XG5cblx0QWRtaW5FdmVudExpc3RDdHJsLiRpbmplY3QgPSBbJ0ZpcmUnLCAnJGxvY2F0aW9uJywgJyR0aW1lb3V0JywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gQWRtaW5FdmVudExpc3RDdHJsKEZpcmUsICRsb2NhdGlvbiwgJHRpbWVvdXQsIEV2ZW50KSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhRXZ0ID0gdGhpcztcblxuXHRcdGFFdnQuZXZ0VXJsID0gJGxvY2F0aW9uLnByb3RvY29sKCkgKyAnOi8vJyArICRsb2NhdGlvbi5ob3N0KCkgKyAnL2V2ZW50Lyc7XG5cblx0XHQvKipcblx0XHQgKiBIaWRlIFVSTCBpbnB1dCBmaWVsZCB3aGVuIGJsdXJyZWRcblx0XHQgKi9cblx0XHRhRXZ0LmJsdXJVcmxJbnB1dCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0YUV2dC5jb3B5SW5wdXQgPSBudWxsO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBTaG93IFVSTCBpbnB1dCBmaWVsZCB3aGVuIElEIGxpbmsgaXMgY2xpY2tlZFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGluZGV4XG5cdFx0ICovXG5cdFx0YUV2dC5zaG93VXJsSW5wdXQgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0YUV2dC5jb3B5SW5wdXQgPSBpbmRleDtcblxuXHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFuZ3VsYXIuZWxlbWVudCgnI2UnICsgaW5kZXgpLmZpbmQoJ2lucHV0Jykuc2VsZWN0KCk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0Ly8gZ2V0IGV2ZW50cyBmcm9tIEZpcmViYXNlXG5cdFx0YUV2dC5ldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBhbGwgZXZlbnRzXG5cdFx0ICogU2hvdyBBZG1pbiBFdmVudHMgVUlcblx0XHQgKiBEaXNwbGF5IGxpc3Qgb2YgZXZlbnRzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7QXJyYXl9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2dldEFsbEV2ZW50c1N1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coYUV2dC5ldmVudHMpO1xuXG5cdFx0XHRhRXZ0LmV2ZW50c1JlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRhRXZ0LmV2ZW50cy4kbG9hZGVkKF9nZXRBbGxFdmVudHNTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRhRXZ0LnNvcnRTdGFydERhdGUgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdHJldHVybiBFdmVudC5nZXRKU0RhdGV0aW1lKGV2dC5zdGFydERhdGUsIGV2dC5zdGFydFRpbWUpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignRWRpdEV2ZW50Q3RybCcsIEVkaXRFdmVudEN0cmwpO1xuXG5cdEVkaXRFdmVudEN0cmwuJGluamVjdCA9IFsnJGF1dGgnLCAndXNlckRhdGEnLCAnZXZlbnREYXRhJywgJyRyb3V0ZVBhcmFtcycsICckbG9jYXRpb24nLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiBFZGl0RXZlbnRDdHJsKCRhdXRoLCB1c2VyRGF0YSwgZXZlbnREYXRhLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHRpbWVvdXQpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGVkaXQgPSB0aGlzO1xuXG5cdFx0Ly8gZ2V0IHRoZSBldmVudCBJRFxuXHRcdHZhciBfZXZlbnRJZCA9ICRyb3V0ZVBhcmFtcy5ldmVudElkO1xuXG5cdFx0Ly8gdGFic1xuXHRcdGVkaXQudGFicyA9IFsnVXBkYXRlIERldGFpbHMnLCAnRGVsZXRlIEV2ZW50J107XG5cdFx0ZWRpdC5jdXJyZW50VGFiID0gMDtcblxuXHRcdGVkaXQuY2hhbmdlVGFiID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGVkaXQuY3VycmVudFRhYiA9IGluZGV4O1xuXHRcdH07XG5cblx0XHQvLyB2ZXJpZnkgdGhhdCB1c2VyIGlzIGFkbWluXG5cdFx0dXNlckRhdGEuZ2V0VXNlcigpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0ZWRpdC5zaG93RWRpdCA9IGRhdGEuaXNBZG1pbiA/IHRydWUgOiBmYWxzZTtcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZXMgaWYgdGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZFxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZWRpdC5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkYXV0aC5pc0F1dGhlbnRpY2F0ZWQoKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gcmV0dXJuZWQgb24gc3VjY2Vzc2Z1bCBBUEkgY2FsbCBmb3IgdGhpcyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gZXZlbnQgZGF0YVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2dldEV2ZW50U3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRlZGl0LmVkaXRFdmVudCA9IGRhdGE7XG5cdFx0XHRlZGl0LnNob3dFZGl0Rm9ybSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZXZlbnREYXRhLmdldEV2ZW50KF9ldmVudElkKS50aGVuKF9nZXRFdmVudFN1Y2Nlc3MpO1xuXG5cdFx0LyoqXG5cdFx0ICogUmVzZXQgdGhlIGRlbGV0ZSBidXR0b24gdG8gZGVmYXVsdCBzdGF0ZVxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfYnRuRGVsZXRlUmVzZXQoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZSA9IGZhbHNlO1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0ZSBFdmVudCc7XG5cdFx0fVxuXG5cdFx0X2J0bkRlbGV0ZVJlc2V0KCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiByZXR1cm5lZCBvbiBzdWNjZXNzZnVsIGRlbGV0aW9uIG9mIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9kZWxldGVTdWNjZXNzKCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0ZWQhJztcblx0XHRcdGVkaXQuYnRuRGVsZXRlID0gdHJ1ZTtcblx0XHRcdGVkaXQuZWRpdEV2ZW50ID0ge307XG5cblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2FkbWluJyk7XG5cdFx0XHR9LCAxNTAwKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiByZXR1cm5lZCBvbiBlcnJvciBkZWxldGluZyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZGVsZXRlRXJyb3IoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRXJyb3IgZGVsZXRpbmchJztcblxuXHRcdFx0JHRpbWVvdXQoX2J0bkRlbGV0ZVJlc2V0LCAzMDAwKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZWxldGUgdGhlIGV2ZW50XG5cdFx0ICovXG5cdFx0ZWRpdC5kZWxldGVFdmVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0aW5nLi4uJztcblxuXHRcdFx0ZXZlbnREYXRhLmRlbGV0ZUV2ZW50KF9ldmVudElkKS50aGVuKF9kZWxldGVTdWNjZXNzLCBfZGVsZXRlRXJyb3IpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdldmVudEZvcm0nLCBldmVudEZvcm0pO1xuXG5cdGV2ZW50Rm9ybS4kaW5qZWN0ID0gWydGaXJlJywgJ1V0aWxzJywgJyR0aW1lb3V0JywgJyRsb2NhdGlvbicsICckZmlsdGVyJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gZXZlbnRGb3JtKEZpcmUsIFV0aWxzLCAkdGltZW91dCwgJGxvY2F0aW9uLCAkZmlsdGVyLCBFdmVudCkge1xuXG5cdFx0ZXZlbnRGb3JtQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIGV2ZW50Rm9ybUN0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgZWYgPSB0aGlzO1xuXG5cdFx0XHQvLyBjaGVjayBpZiBmb3JtIGlzIGNyZWF0ZSBvciBlZGl0XG5cdFx0XHR2YXIgX2lzQ3JlYXRlID0galF1ZXJ5LmlzRW1wdHlPYmplY3QoZWYucHJlZmlsbE1vZGVsKSxcblx0XHRcdFx0X2lzRWRpdCA9ICFqUXVlcnkuaXNFbXB0eU9iamVjdChlZi5wcmVmaWxsTW9kZWwpO1xuXG5cdFx0XHR2YXIgZXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdFx0ZWYudGltZVJlZ2V4ID0gL14oMD9bMS05XXwxWzAxMl0pKDpbMC01XVxcZCkgW0FQYXBdW21NXSQvaTtcblxuXHRcdFx0aWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0ZWYuZm9ybU1vZGVsID0gZWYucHJlZmlsbE1vZGVsO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBwcmV2ZW50IHNlbGVjdGluZyBkYXRlcyBpbiB0aGUgcGFzdFxuXHRcdFx0ZWYubWluRGF0ZSA9IG5ldyBEYXRlKCk7XG5cblx0XHRcdGVmLmRhdGVPcHRpb25zID0ge1xuXHRcdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0XHR9O1xuXG5cdFx0XHRlZi5zdGFydERhdGVPcGVuID0gZmFsc2U7XG5cdFx0XHRlZi5lbmREYXRlT3BlbiA9IGZhbHNlO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFRvZ2dsZSB0aGUgZGF0ZXBpY2tlciBvcGVuL2Nsb3NlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSAkZXZlbnQge29iamVjdH1cblx0XHRcdCAqIEBwYXJhbSBkYXRlTmFtZSB7c3RyaW5nfSBzdGFydERhdGUgLyBlbmREYXRlXG5cdFx0XHQgKi9cblx0XHRcdGVmLnRvZ2dsZURhdGVwaWNrZXIgPSBmdW5jdGlvbigkZXZlbnQsIGRhdGVOYW1lKSB7XG5cdFx0XHRcdCRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHRcdFx0ZWZbZGF0ZU5hbWUgKyAnT3BlbiddID0gIWVmW2RhdGVOYW1lICsgJ09wZW4nXTtcblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogT24gc3RhcnQgZGF0ZSB2YWxpZCBibHVyLCB1cGRhdGUgZW5kIGRhdGUgaWYgZW1wdHlcblx0XHRcdCAqL1xuXHRcdFx0ZWYuc3RhcnREYXRlQmx1ciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoZWYuZm9ybU1vZGVsICYmIGVmLmZvcm1Nb2RlbC5zdGFydERhdGUgJiYgIWVmLmZvcm1Nb2RlbC5lbmREYXRlKSB7XG5cdFx0XHRcdFx0ZWYuZm9ybU1vZGVsLmVuZERhdGUgPSAkZmlsdGVyKCdkYXRlJykoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSwgJ01NL2RkL3l5eXknKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXNldCB0aGUgc3RhdGUgb2YgdGhlIGZvcm0gU3VibWl0IGJ1dHRvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9idG5TdWJtaXRSZXNldCgpIHtcblx0XHRcdFx0ZWYuYnRuU2F2ZWQgPSBmYWxzZTtcblx0XHRcdFx0ZWYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTdWJtaXQnIDogJ1VwZGF0ZSc7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogR28gdG8gRXZlbnRzIHRhYlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9nb1RvRXZlbnRzKCkge1xuXHRcdFx0XHQkbG9jYXRpb24uc2VhcmNoKCd2aWV3JywgJ2V2ZW50cycpO1xuXHRcdFx0fVxuXG5cdFx0XHRfYnRuU3VibWl0UmVzZXQoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgZXZlbnQgQVBJIGNhbGwgc3VjY2VlZGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2V2ZW50U3VjY2VzcyhyZWYpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FkZGVkIHJlY29yZCB3aXRoIGlkICcsIHJlZi5rZXkoKSk7XG5cblx0XHRcdFx0ZWYuYnRuU2F2ZWQgPSB0cnVlO1xuXHRcdFx0XHRlZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1NhdmVkIScgOiAnVXBkYXRlZCEnO1xuXG5cdFx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0XHRlZi5zaG93UmVkaXJlY3RNc2cgPSB0cnVlO1xuXHRcdFx0XHRcdCR0aW1lb3V0KF9nb1RvRXZlbnRzLCAyNTAwKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdFx0ZWYuc2hvd1VwZGF0ZURldGFpbExpbmsgPSB0cnVlO1xuXHRcdFx0XHRcdCR0aW1lb3V0KF9idG5TdWJtaXRSZXNldCwgMjUwMCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgZXZlbnQgQVBJIGNhbGwgZXJyb3Jcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXZlbnRFcnJvcihlcnIpIHtcblx0XHRcdFx0ZWYuYnRuU2F2ZWQgPSAnZXJyb3InO1xuXHRcdFx0XHRlZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ0Vycm9yIHNhdmluZyEnIDogJ0Vycm9yIHVwZGF0aW5nISc7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayBpZiBldmVudCBzdGFydCBhbmQgZW5kIGRhdGV0aW1lcyBhcmUgYSB2YWxpZCByYW5nZVxuXHRcdFx0ICogUnVucyBvbiBibHVyIG9mIGV2ZW50IGRhdGVzL3RpbWVzXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0XHQgKi9cblx0XHRcdGVmLnZhbGlkYXRlRGF0ZXJhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChlZi5mb3JtTW9kZWwgJiYgZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSAmJiBlZi5mb3JtTW9kZWwuc3RhcnRUaW1lICYmIGVmLmZvcm1Nb2RlbC5lbmREYXRlICYmIGVmLmZvcm1Nb2RlbC5lbmRUaW1lKSB7XG5cdFx0XHRcdFx0dmFyIHN0YXJ0RGF0ZXRpbWUgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGVmLmZvcm1Nb2RlbC5zdGFydERhdGUsIGVmLmZvcm1Nb2RlbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRcdFx0ZW5kRGF0ZXRpbWUgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGVmLmZvcm1Nb2RlbC5lbmREYXRlLCBlZi5mb3JtTW9kZWwuZW5kVGltZSk7XG5cblx0XHRcdFx0XHRlZi52YWxpZERhdGVyYW5nZSA9IChzdGFydERhdGV0aW1lIC0gZW5kRGF0ZXRpbWUpIDwgMDtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBzdWJtaXQgYnV0dG9uXG5cdFx0XHQgKiBTdWJtaXQgbmV3IGV2ZW50IHRvIEFQSVxuXHRcdFx0ICogRm9ybSBAIGV2ZW50Rm9ybS50cGwuaHRtbFxuXHRcdFx0ICovXG5cdFx0XHRlZi5zdWJtaXRFdmVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0ZXZlbnRzLiRhZGQoZWYuZm9ybU1vZGVsKS50aGVuKF9ldmVudFN1Y2Nlc3MsIF9ldmVudEVycm9yKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHQvLyBUT0RPOiBob3cgdG8gZWRpdCBhbiBleGlzdGluZyBldmVudD9cblx0XHRcdFx0XHQvL2V2ZW50RGF0YS51cGRhdGVFdmVudChlZi5mb3JtTW9kZWwuX2lkLCBlZi5mb3JtTW9kZWwpLnRoZW4oX2V2ZW50U3VjY2VzcywgX2V2ZW50RXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdHByZWZpbGxNb2RlbDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICcvbmctYXBwL2FkbWluL2V2ZW50Rm9ybS50cGwuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiBldmVudEZvcm1DdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZWYnLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZhbGlkYXRlRGF0ZUZ1dHVyZScsIHZhbGlkYXRlRGF0ZUZ1dHVyZSk7XG5cblx0dmFsaWRhdGVEYXRlRnV0dXJlLiRpbmplY3QgPSBbJ2V2ZW50RGF0YScsICckdGltZW91dCcsICckbG9jYXRpb24nLCAnJGZpbHRlcicsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIHZhbGlkYXRlRGF0ZUZ1dHVyZSgpIHtcblxuXHRcdHZhbGlkYXRlRGF0ZUZ1dHVyZUxpbmsuJGluamVjdCA9IFsnJHNjb3BlJywgJyRlbGVtJywgJyRhdHRycycsICduZ01vZGVsJ107XG5cblx0XHRmdW5jdGlvbiB2YWxpZGF0ZURhdGVGdXR1cmVMaW5rKCRzY29wZSwgJGVsZW0sICRhdHRycywgbmdNb2RlbCkge1xuXHRcdFx0dmFyIF9ub3cgPSBuZXcgRGF0ZSgpLFxuXHRcdFx0XHRfeWVzdGVyZGF5ID0gX25vdy5zZXREYXRlKF9ub3cuZ2V0RGF0ZSgpIC0gMSk7XG5cblx0XHRcdG5nTW9kZWwuJHBhcnNlcnMudW5zaGlmdChmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgX2QgPSBEYXRlLnBhcnNlKHZhbHVlKSxcblx0XHRcdFx0XHRfdmFsaWQgPSBfeWVzdGVyZGF5IC0gX2QgPCAwO1xuXG5cdFx0XHRcdG5nTW9kZWwuJHNldFZhbGlkaXR5KCdwYXN0RGF0ZScsIF92YWxpZCk7XG5cblx0XHRcdFx0cmV0dXJuIF92YWxpZCA/IHZhbHVlIDogdW5kZWZpbmVkO1xuXHRcdFx0fSk7XG5cblx0XHRcdG5nTW9kZWwuJGZvcm1hdHRlcnMudW5zaGlmdChmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgX2QgPSBEYXRlLnBhcnNlKHZhbHVlKSxcblx0XHRcdFx0XHRfdmFsaWQgPSBfeWVzdGVyZGF5IC0gX2QgPCAwO1xuXG5cdFx0XHRcdG5nTW9kZWwuJHNldFZhbGlkaXR5KCdwYXN0RGF0ZScsIF92YWxpZCk7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogdmFsaWRhdGVEYXRlRnV0dXJlTGlua1xuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZpZXdFdmVudEd1ZXN0cycsIHZpZXdFdmVudEd1ZXN0cyk7XG5cblx0dmlld0V2ZW50R3Vlc3RzLiRpbmplY3QgPSBbJ3JzdnBEYXRhJ107XG5cblx0ZnVuY3Rpb24gdmlld0V2ZW50R3Vlc3RzKHJzdnBEYXRhKSB7XG5cblx0XHR2aWV3RXZlbnRHdWVzdHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG5cdFx0ZnVuY3Rpb24gdmlld0V2ZW50R3Vlc3RzQ3RybCgkc2NvcGUpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBzeW50YXhcblx0XHRcdHZhciBnID0gdGhpcztcblxuXHRcdFx0JHNjb3BlLiR3YXRjaCgnZy5ldmVudElkJywgZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwpIHtcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgUlNWUHMgZm9yIHRoaXMgZXZlbnRcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogQHBhcmFtIGRhdGEge0FycmF5fSBndWVzdHMgYXJyYXlcblx0XHRcdFx0ICogQHByaXZhdGVcblx0XHRcdFx0ICovXG5cdFx0XHRcdGZ1bmN0aW9uIF9nZXRHdWVzdHNTdWNjZXNzKGRhdGEpIHtcblx0XHRcdFx0XHR2YXIgX3RvdGFsR3Vlc3RzID0gMDtcblxuXHRcdFx0XHRcdGcuZ3Vlc3RzID0gZGF0YTtcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZy5ndWVzdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdF90b3RhbEd1ZXN0cyArPSBnLmd1ZXN0c1tpXS5ndWVzdHM7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Zy50b3RhbEd1ZXN0cyA9IF90b3RhbEd1ZXN0cztcblx0XHRcdFx0XHRnLmd1ZXN0c1JlYWR5ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChuZXdWYWwpIHtcblx0XHRcdFx0XHRnLmd1ZXN0c1JlYWR5ID0gZmFsc2U7XG5cblx0XHRcdFx0XHRyc3ZwRGF0YS5nZXRFdmVudEd1ZXN0cyhuZXdWYWwpLnRoZW4oX2dldEd1ZXN0c1N1Y2Nlc3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbG9zZSB0aGlzIG1vZGFsIGRpcmVjdGl2ZVxuXHRcdFx0ICovXG5cdFx0XHRnLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Zy5zaG93TW9kYWwgPSBmYWxzZTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZXZlbnRJZDogJz0nLFxuXHRcdFx0XHRldmVudE5hbWU6ICc9Jyxcblx0XHRcdFx0c2hvd01vZGFsOiAnPSdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJy9uZy1hcHAvYWRtaW4vdmlld0V2ZW50R3Vlc3RzLnRwbC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6IHZpZXdFdmVudEd1ZXN0c0N0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdnJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9XG5cdH1cbn0pKCk7IiwiLy8gRXZlbnQgZnVuY3Rpb25zXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5mYWN0b3J5KCdFdmVudCcsIEV2ZW50KTtcblxuXHRFdmVudC4kaW5qZWN0ID0gWydVdGlscycsICckZmlsdGVyJ107XG5cblx0ZnVuY3Rpb24gRXZlbnQoVXRpbHMsICRmaWx0ZXIpIHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIHByZXR0eSBkYXRlIGZvciBVSSBkaXNwbGF5IGZyb20gdGhlIHN0YXJ0IGFuZCBlbmQgZGF0ZXRpbWVzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRPYmoge29iamVjdH0gdGhlIGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IHByZXR0eSBzdGFydCBhbmQgZW5kIGRhdGUgLyB0aW1lIHN0cmluZ1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldFByZXR0eURhdGV0aW1lKGV2ZW50T2JqKSB7XG5cdFx0XHR2YXIgc3RhcnREYXRlID0gZXZlbnRPYmouc3RhcnREYXRlLFxuXHRcdFx0XHRzdGFydEQgPSBuZXcgRGF0ZShzdGFydERhdGUpLFxuXHRcdFx0XHRzdGFydFRpbWUgPSBldmVudE9iai5zdGFydFRpbWUsXG5cdFx0XHRcdGVuZERhdGUgPSBldmVudE9iai5lbmREYXRlLFxuXHRcdFx0XHRlbmREID0gbmV3IERhdGUoZW5kRGF0ZSksXG5cdFx0XHRcdGVuZFRpbWUgPSBldmVudE9iai5lbmRUaW1lLFxuXHRcdFx0XHRkYXRlRm9ybWF0U3RyID0gJ01NTSBkIHl5eXknLFxuXHRcdFx0XHRwcmV0dHlTdGFydERhdGUgPSAkZmlsdGVyKCdkYXRlJykoc3RhcnRELCBkYXRlRm9ybWF0U3RyKSxcblx0XHRcdFx0cHJldHR5RW5kRGF0ZSA9ICRmaWx0ZXIoJ2RhdGUnKShlbmRELCBkYXRlRm9ybWF0U3RyKSxcblx0XHRcdFx0cHJldHR5RGF0ZXRpbWU7XG5cblx0XHRcdGlmIChwcmV0dHlTdGFydERhdGUgPT09IHByZXR0eUVuZERhdGUpIHtcblx0XHRcdFx0Ly8gZXZlbnQgc3RhcnRzIGFuZCBlbmRzIG9uIHRoZSBzYW1lIGRheVxuXHRcdFx0XHQvLyBBcHIgMjkgMjAxNSwgMTI6MDAgUE0gLSA1OjAwIFBNXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lID0gcHJldHR5U3RhcnREYXRlICsgJywgJyArIHN0YXJ0VGltZSArICcgLSAnICsgZW5kVGltZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIGV2ZW50IHN0YXJ0cyBhbmQgZW5kcyBvbiBkaWZmZXJlbnQgZGF5c1xuXHRcdFx0XHQvLyBEZWMgMzEgMjAxNCwgODowMCBQTSAtIEphbiAxIDIwMTUsIDExOjAwIEFNXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lID0gcHJldHR5U3RhcnREYXRlICsgJywgJyArIHN0YXJ0VGltZSArICcgLSAnICsgcHJldHR5RW5kRGF0ZSArICcsICcgKyBlbmRUaW1lO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcHJldHR5RGF0ZXRpbWU7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogR2V0IEphdmFTY3JpcHQgRGF0ZSBmcm9tIGV2ZW50IGRhdGUgYW5kIHRpbWUgc3RyaW5nc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGVTdHIge3N0cmluZ30gbW0vZGQveXl5XG5cdFx0ICogQHBhcmFtIHRpbWVTdHIge3N0cmluZ30gaGg6bW0gQU0vUE1cblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRKU0RhdGV0aW1lKGRhdGVTdHIsIHRpbWVTdHIpIHtcblx0XHRcdHZhciBkID0gbmV3IERhdGUoZGF0ZVN0ciksXG5cdFx0XHRcdHRpbWVBcnIgPSB0aW1lU3RyLnNwbGl0KCcgJyksXG5cdFx0XHRcdHRpbWUgPSB0aW1lQXJyWzBdLnNwbGl0KCc6JyksXG5cdFx0XHRcdGhvdXJzID0gdGltZVswXSAqIDEsXG5cdFx0XHRcdG1pbnV0ZXMgPSB0aW1lWzFdICogMSxcblx0XHRcdFx0YW1wbSA9IHRpbWVBcnJbMV0sXG5cdFx0XHRcdGZ1bGxkYXRlO1xuXG5cdFx0XHRpZiAoYW1wbSA9PSAnUE0nKSB7XG5cdFx0XHRcdGlmIChob3VycyAhPT0gMTIpIHtcblx0XHRcdFx0XHRob3VycyA9IGhvdXJzICsgMTI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVsbGRhdGUgPSBuZXcgRGF0ZShkLmdldEZ1bGxZZWFyKCksIGQuZ2V0TW9udGgoKSwgZC5nZXREYXRlKCksIGhvdXJzLCBtaW51dGVzKTtcblxuXHRcdFx0cmV0dXJuIGZ1bGxkYXRlO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZSBpZiBldmVudCBpcyBleHBpcmVkXG5cdFx0ICogKGVuZCBkYXRlL3RpbWUgaGFzIHBhc3NlZCBjdXJyZW50IGRhdGUvdGltZSlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldnQge29iamVjdH0gZXZlbnQgb2JqZWN0XG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZXhwaXJlZChldnQpIHtcblx0XHRcdHZhciBqc1N0YXJ0RGF0ZSA9IGdldEpTRGF0ZXRpbWUoZXZ0LmVuZERhdGUsIGV2dC5lbmRUaW1lKSxcblx0XHRcdFx0bm93ID0gbmV3IERhdGUoKTtcblxuXHRcdFx0cmV0dXJuIGpzU3RhcnREYXRlIDwgbm93O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRQcmV0dHlEYXRldGltZTogZ2V0UHJldHR5RGF0ZXRpbWUsXG5cdFx0XHRnZXRKU0RhdGV0aW1lOiBnZXRKU0RhdGV0aW1lLFxuXHRcdFx0ZXhwaXJlZDogZXhwaXJlZFxuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnRmlyZScsIEZpcmUpO1xuXG5cdEZpcmUuJGluamVjdCA9IFsnJGZpcmViYXNlQXV0aCcsICckZmlyZWJhc2VPYmplY3QnLCAnJGZpcmViYXNlQXJyYXknXTtcblxuXHRmdW5jdGlvbiBGaXJlKCRmaXJlYmFzZUF1dGgsICRmaXJlYmFzZU9iamVjdCwgJGZpcmViYXNlQXJyYXkpIHtcblxuXHRcdHZhciB1cmkgPSAnaHR0cHM6Ly9pbnRlbnNlLWhlYXQtNTgyMi5maXJlYmFzZWlvLmNvbS8nO1xuXHRcdHZhciByZWYgPSBuZXcgRmlyZWJhc2UodXJpKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZpcmViYXNlIGF1dGhlbnRpY2F0aW9uIGNvbnRyb2xzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Kn0gQXV0aGVudGljYXRpb25cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBhdXRoKCkge1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZUF1dGgocmVmKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCBGaXJlYmFzZSBkYXRhXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBGaXJlYmFzZSBkYXRhIG9iamVjdFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRhdGEoKSB7XG5cdFx0XHR2YXIgX3JlZiA9IG5ldyBGaXJlYmFzZSh1cmkgKyAnZGF0YScpO1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZU9iamVjdChfcmVmKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBldmVudHMoKSB7XG5cdFx0XHR2YXIgX3JlZiA9IG5ldyBGaXJlYmFzZSh1cmkgKyAnZXZlbnRzJyk7XG5cdFx0XHRyZXR1cm4gJGZpcmViYXNlQXJyYXkoX3JlZik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHVyaTogdXJpLFxuXHRcdFx0cmVmOiByZWYsXG5cdFx0XHRhdXRoOiBhdXRoLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdGV2ZW50czogZXZlbnRzXG5cdFx0fVxuXHR9XG59KSgpOyIsIi8vIG1lZGlhIHF1ZXJ5IGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ01RJywge1xuXHRcdFx0U01BTEw6ICcobWF4LXdpZHRoOiA3NjdweCknLFxuXHRcdFx0TEFSR0U6ICcobWluLXdpZHRoOiA3NjhweCknXG5cdFx0fSk7XG59KSgpOyIsIi8vIGxvZ2luL09hdXRoIGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ09BVVRIJywge1xuXHRcdFx0TE9HSU5TOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ29vZ2xlJyxcblx0XHRcdFx0XHRuYW1lOiAnR29vZ2xlJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSdcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGFjY291bnQ6ICd0d2l0dGVyJyxcblx0XHRcdFx0XHRuYW1lOiAnVHdpdHRlcicsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL3R3aXR0ZXIuY29tJ1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0YWNjb3VudDogJ2ZhY2Vib29rJyxcblx0XHRcdFx0XHRuYW1lOiAnRmFjZWJvb2snLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly9mYWNlYm9vay5jb20nXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ2l0aHViJyxcblx0XHRcdFx0XHRuYW1lOiAnR2l0SHViJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vZ2l0aHViLmNvbSdcblx0XHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0pO1xufSkoKTsiLCIvLyBVdGlsaXR5IGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnVXRpbHMnLCBVdGlscyk7XG5cblx0ZnVuY3Rpb24gVXRpbHMoKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IG9yZGluYWwgdmFsdWVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBuIHtudW1iZXJ9IGlmIGEgc3RyaW5nIGlzIHByb3ZpZGVkLCAlIHdpbGwgYXR0ZW1wdCB0byBjb252ZXJ0IHRvIG51bWJlclxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IHRoLCBzdCwgbmQsIHJkXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0T3JkaW5hbChuKSB7XG5cdFx0XHR2YXIgb3JkQXJyID0gWyd0aCcsICdzdCcsICduZCcsICdyZCddLFxuXHRcdFx0XHRtb2R1bHVzID0gbiAlIDEwMDtcblxuXHRcdFx0cmV0dXJuIG9yZEFyclsobW9kdWx1cyAtIDIwKSAlIDEwXSB8fCBvcmRBcnJbbW9kdWx1c10gfHwgb3JkQXJyWzBdO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIGEgdW5pcXVlIEdVSUQtbGlrZSBJRFxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge3N0cmluZ31cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZUlkKCkge1xuXHRcdFx0ZnVuY3Rpb24gczQoKSB7XG5cdFx0XHRcdHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRPcmRpbmFsOiBnZXRPcmRpbmFsLFxuXHRcdFx0Z2VuZXJhdGVJZDogZ2VuZXJhdGVJZFxuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQucnVuKGF1dGhSdW4pO1xuXG5cdGF1dGhSdW4uJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnRmlyZSddO1xuXG5cdGZ1bmN0aW9uIGF1dGhSdW4oJHJvb3RTY29wZSwgJGxvY2F0aW9uLCBGaXJlKSB7XG5cdFx0JHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHtcblx0XHRcdHZhciBfaXNBdXRoZW50aWNhdGVkID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0XHRpZiAobmV4dCAmJiBuZXh0LiQkcm91dGUgJiYgbmV4dC4kJHJvdXRlLnNlY3VyZSAmJiAhX2lzQXV0aGVudGljYXRlZCkge1xuXHRcdFx0XHQkcm9vdFNjb3BlLmF1dGhQYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcblxuXHRcdFx0XHQkcm9vdFNjb3BlLiRldmFsQXN5bmMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gc2VuZCB1c2VyIHRvIGxvZ2luXG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG59KSgpOyIsIi8vIHJvdXRlc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uZmlnKGFwcENvbmZpZyk7XG5cblx0YXBwQ29uZmlnLiRpbmplY3QgPSBbJyRyb3V0ZVByb3ZpZGVyJywgJyRsb2NhdGlvblByb3ZpZGVyJ107XG5cblx0ZnVuY3Rpb24gYXBwQ29uZmlnKCRyb3V0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuXHRcdCRyb3V0ZVByb3ZpZGVyXG5cdFx0XHQud2hlbignLycsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvZXZlbnRzL0V2ZW50cy52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWVcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2xvZ2luJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9sb2dpbi9Mb2dpbi52aWV3Lmh0bWwnXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9ldmVudC86ZXZlbnRJZCcsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvZXZlbnQtZGV0YWlsL0V2ZW50RGV0YWlsLnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvZXZlbnQvOmV2ZW50SWQvZWRpdCcsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvYWRtaW4vRWRpdEV2ZW50LnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvYWNjb3VudCcsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvYWNjb3VudC9BY2NvdW50LnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZSxcblx0XHRcdFx0cmVsb2FkT25TZWFyY2g6IGZhbHNlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9hZG1pbicsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvYWRtaW4vQWRtaW4udmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlLFxuXHRcdFx0XHRyZWxvYWRPblNlYXJjaDogZmFsc2Vcblx0XHRcdH0pXG5cdFx0XHQub3RoZXJ3aXNlKHtcblx0XHRcdFx0cmVkaXJlY3RUbzogJy8nXG5cdFx0XHR9KTtcblxuXHRcdCRsb2NhdGlvblByb3ZpZGVyXG5cdFx0XHQuaHRtbDVNb2RlKHtcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC5oYXNoUHJlZml4KCchJyk7XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnZGV0ZWN0QWRibG9jaycsIGRldGVjdEFkYmxvY2spO1xuXG5cdGRldGVjdEFkYmxvY2suJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJ107XG5cblx0ZnVuY3Rpb24gZGV0ZWN0QWRibG9jaygkdGltZW91dCwgJGxvY2F0aW9uKSB7XG5cblx0XHRkZXRlY3RBZGJsb2NrTGluay4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGVsZW0nLCAnJGF0dHJzJ107XG5cblx0XHRmdW5jdGlvbiBkZXRlY3RBZGJsb2NrTGluaygkc2NvcGUsICRlbGVtLCAkYXR0cnMpIHtcblx0XHRcdC8vIGRhdGEgb2JqZWN0XG5cdFx0XHQkc2NvcGUuYWIgPSB7fTtcblxuXHRcdFx0Ly8gaG9zdG5hbWUgZm9yIG1lc3NhZ2luZ1xuXHRcdFx0JHNjb3BlLmFiLmhvc3QgPSAkbG9jYXRpb24uaG9zdCgpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIGlmIGFkcyBhcmUgYmxvY2tlZCAtIGNhbGxlZCBpbiAkdGltZW91dCB0byBsZXQgQWRCbG9ja2VycyBydW5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXJlQWRzQmxvY2tlZCgpIHtcblx0XHRcdFx0dmFyIF9hID0gJGVsZW0uZmluZCgnLmFkLXRlc3QnKTtcblxuXHRcdFx0XHQkc2NvcGUuYWIuYmxvY2tlZCA9IF9hLmhlaWdodCgpIDw9IDAgfHwgISRlbGVtLmZpbmQoJy5hZC10ZXN0OnZpc2libGUnKS5sZW5ndGg7XG5cdFx0XHR9XG5cblx0XHRcdCR0aW1lb3V0KF9hcmVBZHNCbG9ja2VkLCAyMDApO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdGxpbms6IGRldGVjdEFkYmxvY2tMaW5rLFxuXHRcdFx0dGVtcGxhdGU6ICAgJzxkaXYgY2xhc3M9XCJhZC10ZXN0IGZhLWZhY2Vib29rIGZhLXR3aXR0ZXJcIiBzdHlsZT1cImhlaWdodDoxcHg7XCI+PC9kaXY+JyArXG5cdFx0XHRcdFx0XHQnPGRpdiBuZy1pZj1cImFiLmJsb2NrZWRcIiBjbGFzcz1cImFiLW1lc3NhZ2UgYWxlcnQgYWxlcnQtZGFuZ2VyXCI+JyArXG5cdFx0XHRcdFx0XHRcdCc8aSBjbGFzcz1cImZhIGZhLWJhblwiPjwvaT4gPHN0cm9uZz5BZEJsb2NrPC9zdHJvbmc+IGlzIHByb2hpYml0aW5nIGltcG9ydGFudCBmdW5jdGlvbmFsaXR5ISBQbGVhc2UgZGlzYWJsZSBhZCBibG9ja2luZyBvbiA8c3Ryb25nPnt7YWIuaG9zdH19PC9zdHJvbmc+LiBUaGlzIHNpdGUgaXMgYWQtZnJlZS4nICtcblx0XHRcdFx0XHRcdCc8L2Rpdj4nXG5cdFx0fVxuXHR9XG5cbn0pKCk7IiwiLy8gVXNlciBBUEkgJGh0dHAgY2FsbHNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LnNlcnZpY2UoJ2V2ZW50RGF0YScsIGV2ZW50RGF0YSk7XG5cblx0LyoqXG5cdCAqIEdFVCBwcm9taXNlIHJlc3BvbnNlIGZ1bmN0aW9uXG5cdCAqIENoZWNrcyB0eXBlb2YgZGF0YSByZXR1cm5lZCBhbmQgc3VjY2VlZHMgaWYgSlMgb2JqZWN0LCB0aHJvd3MgZXJyb3IgaWYgbm90XG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSB7Kn0gZGF0YSBmcm9tICRodHRwXG5cdCAqIEByZXR1cm5zIHsqfSBvYmplY3QsIGFycmF5XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBfZ2V0UmVzKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcigncmV0cmlldmVkIGRhdGEgaXMgbm90IHR5cGVvZiBvYmplY3QuJyk7XG5cdFx0fVxuXHR9XG5cblx0ZXZlbnREYXRhLiRpbmplY3QgPSBbJyRodHRwJ107XG5cblx0ZnVuY3Rpb24gZXZlbnREYXRhKCRodHRwKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IGV2ZW50IGJ5IElEXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gaWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEV2ZW50ID0gZnVuY3Rpb24oaWQpIHtcblx0XHRcdHJldHVybiAkaHR0cCh7XG5cdFx0XHRcdG1ldGhvZDogJ0dFVCcsXG5cdFx0XHRcdHVybDogJy9hcGkvZXZlbnQvJyArIGlkXG5cdFx0XHR9KS50aGVuKF9nZXRSZXMpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBHZXQgYWxsIGV2ZW50c1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRBbGxFdmVudHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQuZ2V0KCcvYXBpL2V2ZW50cycpXG5cdFx0XHRcdC50aGVuKF9nZXRSZXMpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYSBuZXcgZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudERhdGEge29iamVjdH0gbmV3IGV2ZW50IGRhdGFcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnREYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LnBvc3QoJy9hcGkvZXZlbnQvbmV3JywgZXZlbnREYXRhKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIGFuIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnREYXRhIHtvYmplY3R9IHVwZGF0ZWQgZXZlbnQgZGF0YVxuXHRcdCAqIEBwYXJhbSBpZCB7c3RyaW5nfSBldmVudCBNb25nb0RCIF9pZFxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMudXBkYXRlRXZlbnQgPSBmdW5jdGlvbihpZCwgZXZlbnREYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LnB1dCgnL2FwaS9ldmVudC8nICsgaWQsIGV2ZW50RGF0YSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZSBhbiBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGlkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5kZWxldGVFdmVudCA9IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmRlbGV0ZSgnL2FwaS9ldmVudC8nICsgaWQpO1xuXHRcdH1cblx0fVxufSkoKTsiLCIvLyBGZXRjaCBsb2NhbCBKU09OIGRhdGFcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LnNlcnZpY2UoJ2xvY2FsRGF0YScsIGxvY2FsRGF0YSk7XG5cblx0LyoqXG5cdCAqIEdFVCBwcm9taXNlIHJlc3BvbnNlIGZ1bmN0aW9uXG5cdCAqIENoZWNrcyB0eXBlb2YgZGF0YSByZXR1cm5lZCBhbmQgc3VjY2VlZHMgaWYgSlMgb2JqZWN0LCB0aHJvd3MgZXJyb3IgaWYgbm90XG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSB7Kn0gZGF0YSBmcm9tICRodHRwXG5cdCAqIEByZXR1cm5zIHsqfSBvYmplY3QsIGFycmF5XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBfZ2V0UmVzKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcigncmV0cmlldmVkIGRhdGEgaXMgbm90IHR5cGVvZiBvYmplY3QuJyk7XG5cdFx0fVxuXHR9XG5cblx0bG9jYWxEYXRhLiRpbmplY3QgPSBbJyRodHRwJ107XG5cblx0ZnVuY3Rpb24gbG9jYWxEYXRhKCRodHRwKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IGxvY2FsIEpTT04gZGF0YSBmaWxlIGFuZCByZXR1cm4gcmVzdWx0c1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRKU09OID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmdldCgnL25nLWFwcC9kYXRhL2RhdGEuanNvbicpXG5cdFx0XHRcdC50aGVuKF9nZXRSZXMpO1xuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgYW5ndWxhck1lZGlhQ2hlY2sgPSBhbmd1bGFyLm1vZHVsZSgnbWVkaWFDaGVjaycsIFtdKTtcblxuXHRhbmd1bGFyTWVkaWFDaGVjay5zZXJ2aWNlKCdtZWRpYUNoZWNrJywgWyckd2luZG93JywgJyR0aW1lb3V0JywgZnVuY3Rpb24gKCR3aW5kb3csICR0aW1lb3V0KSB7XG5cdFx0dGhpcy5pbml0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRcdHZhciAkc2NvcGUgPSBvcHRpb25zWydzY29wZSddLFxuXHRcdFx0XHRxdWVyeSA9IG9wdGlvbnNbJ21xJ10sXG5cdFx0XHRcdGRlYm91bmNlID0gb3B0aW9uc1snZGVib3VuY2UnXSxcblx0XHRcdFx0JHdpbiA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KSxcblx0XHRcdFx0YnJlYWtwb2ludHMsXG5cdFx0XHRcdGNyZWF0ZUxpc3RlbmVyID0gdm9pZCAwLFxuXHRcdFx0XHRoYXNNYXRjaE1lZGlhID0gJHdpbmRvdy5tYXRjaE1lZGlhICE9PSB1bmRlZmluZWQgJiYgISEkd2luZG93Lm1hdGNoTWVkaWEoJyEnKS5hZGRMaXN0ZW5lcixcblx0XHRcdFx0bXFMaXN0TGlzdGVuZXIsXG5cdFx0XHRcdG1tTGlzdGVuZXIsXG5cdFx0XHRcdGRlYm91bmNlUmVzaXplLFxuXHRcdFx0XHRtcSA9IHZvaWQgMCxcblx0XHRcdFx0bXFDaGFuZ2UgPSB2b2lkIDAsXG5cdFx0XHRcdGRlYm91bmNlU3BlZWQgPSAhIWRlYm91bmNlID8gZGVib3VuY2UgOiAyNTA7XG5cblx0XHRcdGlmIChoYXNNYXRjaE1lZGlhKSB7XG5cdFx0XHRcdG1xQ2hhbmdlID0gZnVuY3Rpb24gKG1xKSB7XG5cdFx0XHRcdFx0aWYgKG1xLm1hdGNoZXMgJiYgdHlwZW9mIG9wdGlvbnMuZW50ZXIgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdG9wdGlvbnMuZW50ZXIobXEpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuZXhpdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmV4aXQobXEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuY2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRvcHRpb25zLmNoYW5nZShtcSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNyZWF0ZUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdG1xID0gJHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KTtcblx0XHRcdFx0XHRtcUxpc3RMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBtcUNoYW5nZShtcSlcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0bXEuYWRkTGlzdGVuZXIobXFMaXN0TGlzdGVuZXIpO1xuXG5cdFx0XHRcdFx0Ly8gYmluZCB0byB0aGUgb3JpZW50YXRpb25jaGFuZ2UgZXZlbnQgYW5kIGZpcmUgbXFDaGFuZ2Vcblx0XHRcdFx0XHQkd2luLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgbXFMaXN0TGlzdGVuZXIpO1xuXG5cdFx0XHRcdFx0Ly8gY2xlYW51cCBsaXN0ZW5lcnMgd2hlbiAkc2NvcGUgaXMgJGRlc3Ryb3llZFxuXHRcdFx0XHRcdCRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0bXEucmVtb3ZlTGlzdGVuZXIobXFMaXN0TGlzdGVuZXIpO1xuXHRcdFx0XHRcdFx0JHdpbi51bmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgbXFMaXN0TGlzdGVuZXIpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIG1xQ2hhbmdlKG1xKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRyZXR1cm4gY3JlYXRlTGlzdGVuZXIoKTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnJlYWtwb2ludHMgPSB7fTtcblxuXHRcdFx0XHRtcUNoYW5nZSA9IGZ1bmN0aW9uIChtcSkge1xuXHRcdFx0XHRcdGlmIChtcS5tYXRjaGVzKSB7XG5cdFx0XHRcdFx0XHRpZiAoISFicmVha3BvaW50c1txdWVyeV0gPT09IGZhbHNlICYmICh0eXBlb2Ygb3B0aW9ucy5lbnRlciA9PT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5lbnRlcihtcSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChicmVha3BvaW50c1txdWVyeV0gPT09IHRydWUgfHwgYnJlYWtwb2ludHNbcXVlcnldID09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmV4aXQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmV4aXQobXEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKChtcS5tYXRjaGVzICYmICghYnJlYWtwb2ludHNbcXVlcnldKSB8fCAoIW1xLm1hdGNoZXMgJiYgKGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PT0gdHJ1ZSB8fCBicmVha3BvaW50c1txdWVyeV0gPT0gbnVsbCkpKSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmNoYW5nZShtcSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIGJyZWFrcG9pbnRzW3F1ZXJ5XSA9IG1xLm1hdGNoZXM7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGNvbnZlcnRFbVRvUHggPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0XHR2YXIgZW1FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cblx0XHRcdFx0XHRlbUVsZW1lbnQuc3R5bGUud2lkdGggPSAnMWVtJztcblx0XHRcdFx0XHRlbUVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZW1FbGVtZW50KTtcblx0XHRcdFx0XHRweCA9IHZhbHVlICogZW1FbGVtZW50Lm9mZnNldFdpZHRoO1xuXHRcdFx0XHRcdGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoZW1FbGVtZW50KTtcblxuXHRcdFx0XHRcdHJldHVybiBweDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgZ2V0UFhWYWx1ZSA9IGZ1bmN0aW9uICh3aWR0aCwgdW5pdCkge1xuXHRcdFx0XHRcdHZhciB2YWx1ZTtcblx0XHRcdFx0XHR2YWx1ZSA9IHZvaWQgMDtcblx0XHRcdFx0XHRzd2l0Y2ggKHVuaXQpIHtcblx0XHRcdFx0XHRcdGNhc2UgJ2VtJzpcblx0XHRcdFx0XHRcdFx0dmFsdWUgPSBjb252ZXJ0RW1Ub1B4KHdpZHRoKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9IHdpZHRoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0YnJlYWtwb2ludHNbcXVlcnldID0gbnVsbDtcblxuXHRcdFx0XHRtbUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBwYXJ0cyA9IHF1ZXJ5Lm1hdGNoKC9cXCgoLiopLS4qOlxccyooW1xcZFxcLl0qKSguKilcXCkvKSxcblx0XHRcdFx0XHRcdGNvbnN0cmFpbnQgPSBwYXJ0c1sxXSxcblx0XHRcdFx0XHRcdHZhbHVlID0gZ2V0UFhWYWx1ZShwYXJzZUludChwYXJ0c1syXSwgMTApLCBwYXJ0c1szXSksXG5cdFx0XHRcdFx0XHRmYWtlTWF0Y2hNZWRpYSA9IHt9LFxuXHRcdFx0XHRcdFx0d2luZG93V2lkdGggPSAkd2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuXG5cdFx0XHRcdFx0ZmFrZU1hdGNoTWVkaWEubWF0Y2hlcyA9IGNvbnN0cmFpbnQgPT09ICdtYXgnICYmIHZhbHVlID4gd2luZG93V2lkdGggfHwgY29uc3RyYWludCA9PT0gJ21pbicgJiYgdmFsdWUgPCB3aW5kb3dXaWR0aDtcblxuXHRcdFx0XHRcdHJldHVybiBtcUNoYW5nZShmYWtlTWF0Y2hNZWRpYSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGZha2VNYXRjaE1lZGlhUmVzaXplID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dChkZWJvdW5jZVJlc2l6ZSk7XG5cdFx0XHRcdFx0ZGVib3VuY2VSZXNpemUgPSAkdGltZW91dChtbUxpc3RlbmVyLCBkZWJvdW5jZVNwZWVkKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkd2luLmJpbmQoJ3Jlc2l6ZScsIGZha2VNYXRjaE1lZGlhUmVzaXplKTtcblxuXHRcdFx0XHQkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkd2luLnVuYmluZCgncmVzaXplJywgZmFrZU1hdGNoTWVkaWFSZXNpemUpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gbW1MaXN0ZW5lcigpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH1dKTtcbn0pKCk7IiwiLy8gVXNlciBBUEkgJGh0dHAgY2FsbHNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LnNlcnZpY2UoJ3JzdnBEYXRhJywgcnN2cERhdGEpO1xuXG5cdC8qKlxuXHQgKiBHRVQgcHJvbWlzZSByZXNwb25zZSBmdW5jdGlvblxuXHQgKiBDaGVja3MgdHlwZW9mIGRhdGEgcmV0dXJuZWQgYW5kIHN1Y2NlZWRzIGlmIEpTIG9iamVjdCwgdGhyb3dzIGVycm9yIGlmIG5vdFxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ugeyp9IGRhdGEgZnJvbSAkaHR0cFxuXHQgKiBAcmV0dXJucyB7Kn0gb2JqZWN0LCBhcnJheVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gX2dldFJlcyhyZXNwb25zZSkge1xuXHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3JldHJpZXZlZCBkYXRhIGlzIG5vdCB0eXBlb2Ygb2JqZWN0LicpO1xuXHRcdH1cblx0fVxuXG5cdHJzdnBEYXRhLiRpbmplY3QgPSBbJyRodHRwJ107XG5cblx0ZnVuY3Rpb24gcnN2cERhdGEoJGh0dHApIHtcblx0XHQvKipcblx0XHQgKiBHZXQgYWxsIFJTVlBlZCBndWVzdHMgZm9yIGEgc3BlY2lmaWMgZXZlbnQgYnkgZXZlbnQgSURcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudElkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRFdmVudEd1ZXN0cyA9IGZ1bmN0aW9uKGV2ZW50SWQpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQuZ2V0KCcvYXBpL3JzdnBzL2V2ZW50LycgKyBldmVudElkKVxuXHRcdFx0XHQudGhlbihfZ2V0UmVzKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIGEgbmV3IFJTVlAgZm9yIGFuIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRJZCB7c3RyaW5nfSBldmVudCBNb25nb0RCIF9pZFxuXHRcdCAqIEBwYXJhbSByc3ZwRGF0YSB7b2JqZWN0fSBuZXcgUlNWUCBkYXRhXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5jcmVhdGVSc3ZwID0gZnVuY3Rpb24oZXZlbnRJZCwgcnN2cERhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucG9zdCgnL2FwaS9yc3ZwL2V2ZW50LycgKyBldmVudElkLCByc3ZwRGF0YSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZSBhbiBSU1ZQIGJ5IHNwZWNpZmljIFJTVlAgSURcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSByc3ZwSWQge3N0cmluZ30gUlNWUCBNb25nb0RCIF9pZFxuXHRcdCAqIEBwYXJhbSByc3ZwRGF0YSB7b2JqZWN0fSB1cGRhdGVkIFJTVlAgZGF0YVxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMudXBkYXRlUnN2cCA9IGZ1bmN0aW9uKHJzdnBJZCwgcnN2cERhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucHV0KCcvYXBpL3JzdnAvJyArIHJzdnBJZCwgcnN2cERhdGEpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmlsdGVyKCd0cnVzdEFzSFRNTCcsIHRydXN0QXNIVE1MKTtcblxuXHR0cnVzdEFzSFRNTC4kaW5qZWN0ID0gWyckc2NlJ107XG5cblx0ZnVuY3Rpb24gdHJ1c3RBc0hUTUwoJHNjZSkge1xuXHRcdHJldHVybiBmdW5jdGlvbiAodGV4dCkge1xuXHRcdFx0cmV0dXJuICRzY2UudHJ1c3RBc0h0bWwodGV4dCk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIvLyBGb3IgZXZlbnRzIGJhc2VkIG9uIHZpZXdwb3J0IHNpemUgLSB1cGRhdGVzIGFzIHZpZXdwb3J0IGlzIHJlc2l6ZWRcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgndmlld1N3aXRjaCcsIHZpZXdTd2l0Y2gpO1xuXG5cdHZpZXdTd2l0Y2guJGluamVjdCA9IFsnbWVkaWFDaGVjaycsICdNUScsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIHZpZXdTd2l0Y2gobWVkaWFDaGVjaywgTVEsICR0aW1lb3V0KSB7XG5cblx0XHR2aWV3U3dpdGNoTGluay4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdC8qKlxuXHRcdCAqIHZpZXdTd2l0Y2ggZGlyZWN0aXZlIGxpbmsgZnVuY3Rpb25cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSAkc2NvcGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB2aWV3U3dpdGNoTGluaygkc2NvcGUpIHtcblx0XHRcdC8vIGRhdGEgb2JqZWN0XG5cdFx0XHQkc2NvcGUudnMgPSB7fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGVudGVyIG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2VudGVyRm4oKSB7XG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkc2NvcGUudnMudmlld2Zvcm1hdCA9ICdzbWFsbCc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZXhpdCBtZWRpYSBxdWVyeVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9leGl0Rm4oKSB7XG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkc2NvcGUudnMudmlld2Zvcm1hdCA9ICdsYXJnZSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbml0aWFsaXplIG1lZGlhQ2hlY2tcblx0XHRcdG1lZGlhQ2hlY2suaW5pdCh7XG5cdFx0XHRcdHNjb3BlOiAkc2NvcGUsXG5cdFx0XHRcdG1xOiBNUS5TTUFMTCxcblx0XHRcdFx0ZW50ZXI6IF9lbnRlckZuLFxuXHRcdFx0XHRleGl0OiBfZXhpdEZuXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRsaW5rOiB2aWV3U3dpdGNoTGlua1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignRXZlbnREZXRhaWxDdHJsJywgRXZlbnREZXRhaWxDdHJsKTtcblxuXHRFdmVudERldGFpbEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICckYXV0aCcsICd1c2VyRGF0YScsICdldmVudERhdGEnLCAnJHJvb3RTY29wZScsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIEV2ZW50RGV0YWlsQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGF1dGgsIHVzZXJEYXRhLCBldmVudERhdGEsICRyb290U2NvcGUsIEV2ZW50KSB7XG5cdFx0dmFyIGV2ZW50ID0gdGhpcyxcblx0XHRcdF9ldmVudElkID0gJHJvdXRlUGFyYW1zLmV2ZW50SWQ7XG5cblx0XHQvKipcblx0XHQgKiBEZXRlcm1pbmVzIGlmIHRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHRcdCAqL1xuXHRcdGV2ZW50LmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRhdXRoLmlzQXV0aGVudGljYXRlZCgpO1xuXHRcdH07XG5cblx0XHRldmVudC5zaG93TW9kYWwgPSBmYWxzZTtcblxuXHRcdGV2ZW50Lm9wZW5Sc3ZwTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdGV2ZW50LnNob3dNb2RhbCA9IHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEZldGNoIHRoZSB1c2VyJ3MgZGF0YSBhbmQgcHJvY2VzcyBSU1ZQIGluZm9ybWF0aW9uXG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZXRVc2VyRGF0YSgpIHtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCByZXRyaWV2aW5nIHVzZXIgZGF0YVxuXHRcdFx0ICogQ2hlY2sgaWYgdXNlciBpcyBhZG1pblxuXHRcdFx0ICogVGhlbiBjYWxscyBSU1ZQIGRhdGEgYW5kIGRldGVybWluZXMgaWYgdXNlciBoYXMgUlNWUGVkIHRvIHRoaXMgZXZlbnRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gZGF0YSB7b2JqZWN0fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF91c2VyU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRcdGV2ZW50LnVzZXIgPSBkYXRhO1xuXHRcdFx0XHRldmVudC5pc0FkbWluID0gZGF0YS5pc0FkbWluO1xuXG5cdFx0XHRcdHZhciBfcnN2cHMgPSBldmVudC51c2VyLnJzdnBzO1xuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgX3JzdnBzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIHRoaXNSc3ZwID0gX3JzdnBzW2ldO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXNSc3ZwLmV2ZW50SWQgPT09IF9ldmVudElkKSB7XG5cdFx0XHRcdFx0XHRldmVudC5yc3ZwT2JqID0gdGhpc1JzdnA7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRldmVudC5ub1JzdnAgPSAhZXZlbnQucnN2cE9iajtcblxuXHRcdFx0XHR2YXIgZ3Vlc3RzID0gIWV2ZW50Lm5vUnN2cCA/IGV2ZW50LnJzdnBPYmouZ3Vlc3RzIDogbnVsbDtcblxuXHRcdFx0XHRpZiAoIWV2ZW50Lm5vUnN2cCAmJiAhIWd1ZXN0cyA9PT0gZmFsc2UgfHwgZ3Vlc3RzID09IDEpIHtcblx0XHRcdFx0XHRldmVudC5ndWVzdFRleHQgPSBldmVudC5yc3ZwT2JqLm5hbWUgKyAnIGlzJztcblx0XHRcdFx0fSBlbHNlIGlmIChndWVzdHMgJiYgZ3Vlc3RzID4gMSkge1xuXHRcdFx0XHRcdGV2ZW50Lmd1ZXN0VGV4dCA9IGV2ZW50LnJzdnBPYmoubmFtZSArICcgKyAnICsgKGd1ZXN0cyAtIDEpICsgJyBhcmUgJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGV2ZW50LmF0dGVuZGluZ1RleHQgPSAhZXZlbnQubm9Sc3ZwICYmIGV2ZW50LnJzdnBPYmouYXR0ZW5kaW5nID8gJ2F0dGVuZGluZycgOiAnbm90IGF0dGVuZGluZyc7XG5cdFx0XHRcdGV2ZW50LnJzdnBCdG5UZXh0ID0gZXZlbnQubm9Sc3ZwID8gJ1JTVlAnIDogJ1VwZGF0ZSBteSBSU1ZQJztcblx0XHRcdFx0ZXZlbnQuc2hvd0V2ZW50RG93bmxvYWQgPSBldmVudC5yc3ZwT2JqICYmIGV2ZW50LnJzdnBPYmouYXR0ZW5kaW5nO1xuXHRcdFx0XHRldmVudC5jcmVhdGVPclVwZGF0ZSA9IGV2ZW50Lm5vUnN2cCA/ICdjcmVhdGUnIDogJ3VwZGF0ZSc7XG5cdFx0XHRcdGV2ZW50LnJzdnBSZWFkeSA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdHVzZXJEYXRhLmdldFVzZXIoKS50aGVuKF91c2VyU3VjY2Vzcyk7XG5cdFx0fVxuXG5cdFx0X2dldFVzZXJEYXRhKCk7XG5cblx0XHQvLyB3aGVuIFJTVlAgaGFzIGJlZW4gc3VibWl0dGVkLCB1cGRhdGUgdXNlciBkYXRhXG5cdFx0JHJvb3RTY29wZS4kb24oJ3JzdnBTdWJtaXR0ZWQnLCBfZ2V0VXNlckRhdGEpO1xuXG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgLmljcyBmaWxlIGZvciB0aGlzIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZW5lcmF0ZUljYWwoKSB7XG5cdFx0XHRldmVudC5jYWwgPSBpY3MoKTtcblxuXHRcdFx0dmFyIF9zdGFydEQgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGV2ZW50LmRldGFpbC5zdGFydERhdGUsIGV2ZW50LmRldGFpbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRfZW5kRCA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZlbnQuZGV0YWlsLmVuZERhdGUsIGV2ZW50LmRldGFpbC5lbmRUaW1lKTtcblxuXHRcdFx0ZXZlbnQuY2FsLmFkZEV2ZW50KGV2ZW50LmRldGFpbC50aXRsZSwgZXZlbnQuZGV0YWlsLmRlc2NyaXB0aW9uLCBldmVudC5kZXRhaWwubG9jYXRpb24sIF9zdGFydEQsIF9lbmREKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEb3dubG9hZCAuaWNzIGZpbGVcblx0XHQgKi9cblx0XHRldmVudC5kb3dubG9hZEljcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZXZlbnQuY2FsLmRvd25sb2FkKCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgc2luZ2xlIGV2ZW50IGRldGFpbFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gcHJvbWlzZSBwcm92aWRlZCBieSAkaHR0cCBzdWNjZXNzXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZXZlbnRTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGV2ZW50LmRldGFpbCA9IGRhdGE7XG5cdFx0XHRldmVudC5kZXRhaWwucHJldHR5RGF0ZSA9IEV2ZW50LmdldFByZXR0eURhdGV0aW1lKGV2ZW50LmRldGFpbCk7XG5cdFx0XHRldmVudC5kZXRhaWwuZXhwaXJlZCA9IEV2ZW50LmV4cGlyZWQoZXZlbnQuZGV0YWlsKTtcblx0XHRcdGV2ZW50LmV2ZW50UmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50RGF0YS5nZXRFdmVudChfZXZlbnRJZCkudGhlbihfZXZlbnRTdWNjZXNzKTtcblxuXHRcdHZhciBfd2F0Y2hSc3ZwUmVhZHkgPSAkc2NvcGUuJHdhdGNoKCdldmVudC5yc3ZwUmVhZHknLCBmdW5jdGlvbihuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0aWYgKG5ld1ZhbCAmJiBldmVudC5kZXRhaWwgJiYgZXZlbnQuZGV0YWlsLnJzdnApIHtcblx0XHRcdFx0X2dlbmVyYXRlSWNhbCgpO1xuXHRcdFx0XHRfd2F0Y2hSc3ZwUmVhZHkoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3JzdnBGb3JtJywgcnN2cEZvcm0pO1xuXG5cdHJzdnBGb3JtLiRpbmplY3QgPSBbJ3JzdnBEYXRhJywgJyR0aW1lb3V0JywgJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiByc3ZwRm9ybShyc3ZwRGF0YSwgJHRpbWVvdXQsICRyb290U2NvcGUpIHtcblxuXHRcdHJzdnBGb3JtQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIHJzdnBGb3JtQ3RybCgkc2NvcGUpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBzeW50YXhcblx0XHRcdHZhciByZiA9IHRoaXM7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGZvcm0gaXMgY3JlYXRlIG9yIGVkaXQgKGRvZXMgdGhlIG1vZGVsIGFscmVhZHkgZXhpc3Qgb3Igbm90KVxuXHRcdFx0dmFyIF9pc0NyZWF0ZSA9ICFyZi5mb3JtTW9kZWwsXG5cdFx0XHRcdF9pc0VkaXQgPSAhIXJmLmZvcm1Nb2RlbDtcblxuXHRcdFx0cmYubnVtYmVyUmVnZXggPSAvXihbMS05XXwxMCkkLztcblxuXHRcdFx0aWYgKF9pc0NyZWF0ZSAmJiByZi51c2VyTmFtZSkge1xuXHRcdFx0XHRyZi5mb3JtTW9kZWwgPSB7XG5cdFx0XHRcdFx0dXNlcklkOiByZi51c2VySWQsXG5cdFx0XHRcdFx0ZXZlbnROYW1lOiByZi5ldmVudC50aXRsZSxcblx0XHRcdFx0XHRuYW1lOiByZi51c2VyTmFtZVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFdyYXAgJHdhdGNoIGluIGEgZnVuY3Rpb24gc28gdGhhdCBpdCBjYW4gYmUgcmUtaW5pdGlhbGl6ZWQgYWZ0ZXIgaXQncyBiZWVuIGRlcmVnaXN0ZXJlZFxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfc3RhcnRXYXRjaEF0dGVuZGluZygpIHtcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFdhdGNoIHVzZXIncyBhdHRlbmRpbmcgaW5wdXQgYW5kIGlmIHRydWUsIHNldCBkZWZhdWx0IG51bWJlciBvZiBndWVzdHMgdG8gMVxuXHRcdFx0XHQgKlxuXHRcdFx0XHQgKiBAdHlwZSB7KnxmdW5jdGlvbigpfVxuXHRcdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0XHQgKi9cblx0XHRcdFx0dmFyIF93YXRjaEF0dGVuZGluZyA9ICRzY29wZS4kd2F0Y2goJ3JmLmZvcm1Nb2RlbC5hdHRlbmRpbmcnLCBmdW5jdGlvbiAobmV3VmFsLCBvbGRWYWwpIHtcblx0XHRcdFx0XHRpZiAobmV3VmFsID09PSB0cnVlICYmICFvbGRWYWwgJiYgIXJmLmZvcm1Nb2RlbC5ndWVzdHMpIHtcblx0XHRcdFx0XHRcdHJmLmZvcm1Nb2RlbC5ndWVzdHMgPSAxO1xuXG5cdFx0XHRcdFx0XHQvLyBkZXJlZ2lzdGVyICR3YXRjaFxuXHRcdFx0XHRcdFx0X3dhdGNoQXR0ZW5kaW5nKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RhcnQgd2F0Y2hpbmcgcmYuZm9ybU1vZGVsLmF0dGVuZGluZ1xuXHRcdFx0X3N0YXJ0V2F0Y2hBdHRlbmRpbmcoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXNldCB0aGUgc3RhdGUgb2YgdGhlIGZvcm0gU3VibWl0IGJ1dHRvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9idG5TdWJtaXRSZXNldCgpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSBmYWxzZTtcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTdWJtaXQgUlNWUCcgOiAnVXBkYXRlIFJTVlAnO1xuXHRcdFx0fVxuXG5cdFx0XHRfYnRuU3VibWl0UmVzZXQoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgUlNWUCBBUEkgY2FsbCBzdWNjZWVkZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfcnN2cFN1Y2Nlc3MoKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gdHJ1ZTtcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTdWJtaXR0ZWQhJyA6ICdVcGRhdGVkISc7XG5cblx0XHRcdFx0JHJvb3RTY29wZS4kYnJvYWRjYXN0KCdyc3ZwU3VibWl0dGVkJyk7XG5cblx0XHRcdFx0Ly8gdXNlciBoYXMgc3VibWl0dGVkIGFuIFJTVlA7IHVwZGF0ZSBjcmVhdGUvZWRpdCBzdGF0dXMgaW4gY2FzZSB0aGV5IGVkaXQgd2l0aG91dCByZWZyZXNoaW5nXG5cdFx0XHRcdF9pc0NyZWF0ZSA9IGZhbHNlO1xuXHRcdFx0XHRfaXNFZGl0ID0gdHJ1ZTtcblxuXHRcdFx0XHQvLyByZXN0YXJ0ICR3YXRjaCBvbiByZi5mb3JtTW9kZWwuYXR0ZW5kaW5nXG5cdFx0XHRcdF9zdGFydFdhdGNoQXR0ZW5kaW5nKCk7XG5cblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0X2J0blN1Ym1pdFJlc2V0KCk7XG5cdFx0XHRcdFx0cmYuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBSU1ZQIEFQSSBjYWxsIGVycm9yXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBFcnJvcigpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSAnZXJyb3InO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ0Vycm9yIHN1Ym1pdHRpbmchJyA6ICdFcnJvciB1cGRhdGluZyEnO1xuXG5cdFx0XHRcdCR0aW1lb3V0KF9idG5TdWJtaXRSZXNldCwgMzAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgc3VibWl0IGJ1dHRvblxuXHRcdFx0ICogU3VibWl0IFJTVlAgdG8gQVBJXG5cdFx0XHQgKiBGb3JtIEAgcnN2cEZvcm0udHBsLmh0bWxcblx0XHRcdCAqL1xuXHRcdFx0cmYuc3VibWl0UnN2cCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gJ1NlbmRpbmcuLi4nO1xuXG5cdFx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0XHRyc3ZwRGF0YS5jcmVhdGVSc3ZwKHJmLmV2ZW50Ll9pZCwgcmYuZm9ybU1vZGVsKS50aGVuKF9yc3ZwU3VjY2VzcywgX3JzdnBFcnJvcik7XG5cblx0XHRcdFx0fSBlbHNlIGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdFx0cnN2cERhdGEudXBkYXRlUnN2cChyZi5mb3JtTW9kZWwuX2lkLCByZi5mb3JtTW9kZWwpLnRoZW4oX3JzdnBTdWNjZXNzLCBfcnN2cEVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBmdW5jdGlvbiB0byBjbG9zZSB0aGUgbW9kYWwgd2luZG93XG5cdFx0XHQgKi9cblx0XHRcdHJmLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmYuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZXZlbnQ6ICc9Jyxcblx0XHRcdFx0dXNlck5hbWU6ICdAJyxcblx0XHRcdFx0dXNlcklkOiAnQCcsXG5cdFx0XHRcdGZvcm1Nb2RlbDogJz0nLFxuXHRcdFx0XHRzaG93TW9kYWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnL25nLWFwcC9ldmVudC1kZXRhaWwvcnN2cEZvcm0udHBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogcnN2cEZvcm1DdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAncmYnLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdFdmVudHNDdHJsJywgRXZlbnRzQ3RybCk7XG5cblx0RXZlbnRzQ3RybC4kaW5qZWN0ID0gWydGaXJlJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gRXZlbnRzQ3RybChGaXJlLCBFdmVudCkge1xuXHRcdHZhciBldmVudHMgPSB0aGlzO1xuXG5cdFx0dmFyIF9hdXRoID0gRmlyZS5hdXRoKCk7XG5cblx0XHRfYXV0aC4kb25BdXRoKGZ1bmN0aW9uKGF1dGhEYXRhKSB7XG5cdFx0XHRldmVudHMuaXNBdXRoZW50aWNhdGVkID0gISFhdXRoRGF0YTtcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgZXZlbnRzIGxpc3Rcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRhIHtBcnJheX0gcHJvbWlzZSBwcm92aWRlZCBieSAkaHR0cCBzdWNjZXNzXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZXZlbnRzU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRldmVudHMuYWxsRXZlbnRzID0gZGF0YTtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMuYWxsRXZlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciB0aGlzRXZ0ID0gZXZlbnRzLmFsbEV2ZW50c1tpXTtcblxuXHRcdFx0XHR0aGlzRXZ0LnN0YXJ0RGF0ZUpTID0gRXZlbnQuZ2V0SlNEYXRldGltZSh0aGlzRXZ0LnN0YXJ0RGF0ZSwgdGhpc0V2dC5zdGFydFRpbWUpO1xuXHRcdFx0XHR0aGlzRXZ0LmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKHRoaXNFdnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRldmVudHMuZXZlbnRzUmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50RGF0YS5nZXRBbGxFdmVudHMoKS50aGVuKF9ldmVudHNTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRldmVudHMuc29ydFN0YXJ0RGF0ZSA9IGZ1bmN0aW9uKGV2dCkge1xuXHRcdFx0cmV0dXJuIEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZ0LnN0YXJ0RGF0ZSwgZXZ0LnN0YXJ0VGltZSk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5maWx0ZXIoJ3ByZXR0eURhdGUnLCBwcmV0dHlEYXRlKTtcblxuXHRmdW5jdGlvbiBwcmV0dHlEYXRlKCkge1xuXHRcdC8qKlxuXHRcdCAqIFRha2VzIGEgZGF0ZSBzdHJpbmcgYW5kIGNvbnZlcnRzIGl0IHRvIGEgcHJldHR5IGRhdGVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRlU3RyIHtzdHJpbmd9XG5cdFx0ICovXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIChkYXRlU3RyKSB7XG5cdFx0XHR2YXIgZCA9IG5ldyBEYXRlKGRhdGVTdHIpLFxuXHRcdFx0XHRtb250aHNBcnIgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ10sXG5cdFx0XHRcdG1vbnRoID0gbW9udGhzQXJyW2QuZ2V0TW9udGgoKV0sXG5cdFx0XHRcdGRheSA9IGQuZ2V0RGF0ZSgpLFxuXHRcdFx0XHR5ZWFyID0gZC5nZXRGdWxsWWVhcigpLFxuXHRcdFx0XHRwcmV0dHlEYXRlO1xuXG5cdFx0XHRwcmV0dHlEYXRlID0gbW9udGggKyAnICcgKyBkYXkgKyAnLCAnICsgeWVhcjtcblxuXHRcdFx0cmV0dXJuIHByZXR0eURhdGU7XG5cdFx0fTtcblx0fVxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ215QXBwJylcclxuXHRcdC5jb250cm9sbGVyKCdIZWFkZXJDdHJsJywgaGVhZGVyQ3RybCk7XHJcblxyXG5cdGhlYWRlckN0cmwuJGluamVjdCA9IFsnJGxvY2F0aW9uJywgJ2xvY2FsRGF0YScsICdGaXJlJywgJyRyb290U2NvcGUnXTtcclxuXHJcblx0ZnVuY3Rpb24gaGVhZGVyQ3RybCgkbG9jYXRpb24sIGxvY2FsRGF0YSwgRmlyZSwgJHJvb3RTY29wZSkge1xyXG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxyXG5cdFx0dmFyIGhlYWRlciA9IHRoaXM7XHJcblxyXG5cdFx0Ly8gYXV0aGVudGljYXRpb24gY29udHJvbHNcclxuXHRcdHZhciBfYXV0aCA9IEZpcmUuYXV0aCgpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2V0IHRoZSBsb2NhbCBkYXRhIGZyb20gSlNPTlxyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSBkYXRhXHJcblx0XHQgKiBAcHJpdmF0ZVxyXG5cdFx0ICovXHJcblx0XHRmdW5jdGlvbiBfbG9jYWxEYXRhU3VjY2VzcyhkYXRhKSB7XHJcblx0XHRcdGhlYWRlci5sb2NhbERhdGEgPSBkYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxvY2FsRGF0YS5nZXRKU09OKCkudGhlbihfbG9jYWxEYXRhU3VjY2Vzcyk7XHJcblxyXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2VcclxuXHRcdGhlYWRlci5kYXRhID0gRmlyZS5kYXRhKCk7XHJcblx0XHRoZWFkZXIudXNlciA9IEZpcmUucmVmLmdldEF1dGgoKTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFN1Y2Nlc3MgZnVuY3Rpb24gZnJvbSBhdXRoZW50aWNhdGluZ1xyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSBhdXRoRGF0YSB7b2JqZWN0fVxyXG5cdFx0ICovXHJcblx0XHRmdW5jdGlvbiBfb25BdXRoQ2IoYXV0aERhdGEpIHtcclxuXHRcdFx0aGVhZGVyLnVzZXIgPSBhdXRoRGF0YTtcclxuXHJcblx0XHRcdGlmICghYXV0aERhdGEpIHtcclxuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBvbiBsb2dpbiBvciBsb2dvdXRcclxuXHRcdF9hdXRoLiRvbkF1dGgoX29uQXV0aENiKTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIExvZyB0aGUgdXNlciBvdXQgb2Ygd2hhdGV2ZXIgYXV0aGVudGljYXRpb24gdGhleSd2ZSBzaWduZWQgaW4gd2l0aFxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdF9hdXRoLiR1bmF1dGgoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDdXJyZW50bHkgYWN0aXZlIG5hdiBpdGVtIHdoZW4gJy8nIGluZGV4XHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIuaW5kZXhJc0FjdGl2ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHRcdFx0Ly8gcGF0aCBzaG91bGQgYmUgJy8nXHJcblx0XHRcdHJldHVybiAkbG9jYXRpb24ucGF0aCgpID09PSBwYXRoO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEN1cnJlbnRseSBhY3RpdmUgbmF2IGl0ZW1cclxuXHRcdCAqXHJcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5uYXZJc0FjdGl2ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHRcdFx0cmV0dXJuICRsb2NhdGlvbi5wYXRoKCkuc3Vic3RyKDAsIHBhdGgubGVuZ3RoKSA9PT0gcGF0aDtcclxuXHRcdH07XHJcblx0fVxyXG5cclxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ25hdkNvbnRyb2wnLCBuYXZDb250cm9sKTtcblxuXHRuYXZDb250cm9sLiRpbmplY3QgPSBbJ21lZGlhQ2hlY2snLCAnTVEnLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiBuYXZDb250cm9sKG1lZGlhQ2hlY2ssIE1RLCAkdGltZW91dCkge1xuXG5cdFx0bmF2Q29udHJvbExpbmsuJGluamVjdCA9IFsnJHNjb3BlJywgJyRlbGVtZW50JywgJyRhdHRycyddO1xuXG5cdFx0ZnVuY3Rpb24gbmF2Q29udHJvbExpbmsoJHNjb3BlKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLm5hdiA9IHt9O1xuXG5cdFx0XHR2YXIgX2JvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJ2JvZHknKSxcblx0XHRcdFx0X25hdk9wZW47XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogT3BlbiBtb2JpbGUgbmF2aWdhdGlvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9vcGVuTmF2KCkge1xuXHRcdFx0XHRfYm9keVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnbmF2LWNsb3NlZCcpXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduYXYtb3BlbicpO1xuXG5cdFx0XHRcdF9uYXZPcGVuID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbG9zZSBtb2JpbGUgbmF2aWdhdGlvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9jbG9zZU5hdigpIHtcblx0XHRcdFx0X2JvZHlcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ25hdi1vcGVuJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25hdi1jbG9zZWQnKTtcblxuXHRcdFx0XHRfbmF2T3BlbiA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBlbnRlcmluZyBtb2JpbGUgbWVkaWEgcXVlcnlcblx0XHRcdCAqIENsb3NlIG5hdiBhbmQgc2V0IHVwIG1lbnUgdG9nZ2xpbmcgZnVuY3Rpb25hbGl0eVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9lbnRlck1vYmlsZSgpIHtcblx0XHRcdFx0X2Nsb3NlTmF2KCk7XG5cblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdCAqIFRvZ2dsZSBtb2JpbGUgbmF2aWdhdGlvbiBvcGVuL2Nsb3NlZFxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdCRzY29wZS5uYXYudG9nZ2xlTmF2ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFfbmF2T3Blbikge1xuXHRcdFx0XHRcdFx0XHRfb3Blbk5hdigpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0X2Nsb3NlTmF2KCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JHNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIF9jbG9zZU5hdik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGV4aXRpbmcgbW9iaWxlIG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKiBEaXNhYmxlIG1lbnUgdG9nZ2xpbmcgYW5kIHJlbW92ZSBib2R5IGNsYXNzZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXhpdE1vYmlsZSgpIHtcblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCRzY29wZS5uYXYudG9nZ2xlTmF2ID0gbnVsbDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0X2JvZHkucmVtb3ZlQ2xhc3MoJ25hdi1jbG9zZWQgbmF2LW9wZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIGZ1bmN0aW9uYWxpdHkgdG8gcnVuIG9uIGVudGVyL2V4aXQgb2YgbWVkaWEgcXVlcnlcblx0XHRcdG1lZGlhQ2hlY2suaW5pdCh7XG5cdFx0XHRcdHNjb3BlOiAkc2NvcGUsXG5cdFx0XHRcdG1xOiBNUS5TTUFMTCxcblx0XHRcdFx0ZW50ZXI6IF9lbnRlck1vYmlsZSxcblx0XHRcdFx0ZXhpdDogX2V4aXRNb2JpbGVcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdGxpbms6IG5hdkNvbnRyb2xMaW5rXG5cdFx0fTtcblx0fVxuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignTG9naW5DdHJsJywgTG9naW5DdHJsKTtcblxuXHRMb2dpbkN0cmwuJGluamVjdCA9IFsnRmlyZScsICdPQVVUSCcsICckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICdsb2NhbERhdGEnXTtcblxuXHRmdW5jdGlvbiBMb2dpbkN0cmwoRmlyZSwgT0FVVEgsICRyb290U2NvcGUsICRsb2NhdGlvbiwgbG9jYWxEYXRhKSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBsb2dpbiA9IHRoaXM7XG5cblx0XHQvLyBGaXJlYmFzZSBhdXRoZW50aWNhdGlvblxuXHRcdHZhciBfYXV0aCA9IEZpcmUuYXV0aCgpO1xuXG5cdFx0dmFyIF9sb2dnZWRJbiA9IEZpcmUucmVmLmdldEF1dGgoKTtcblxuXHRcdGlmIChfbG9nZ2VkSW4pIHtcblx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvJyk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gX2xvY2FsRGF0YVN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0bG9naW4ubG9jYWxEYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHRsb2NhbERhdGEuZ2V0SlNPTigpLnRoZW4oX2xvY2FsRGF0YVN1Y2Nlc3MpO1xuXG5cdFx0bG9naW4ubG9naW5zID0gT0FVVEguTE9HSU5TO1xuXG5cdFx0LyoqXG5cdFx0ICogQXV0aGVudGljYXRlIHRoZSB1c2VyIHZpYSBPYXV0aCB3aXRoIHRoZSBzcGVjaWZpZWQgcHJvdmlkZXJcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtICh0d2l0dGVyLCBmYWNlYm9vaywgZ2l0aHViLCBnb29nbGUpXG5cdFx0ICovXG5cdFx0bG9naW4uYXV0aGVudGljYXRlID0gZnVuY3Rpb24ocHJvdmlkZXIpIHtcblx0XHRcdGxvZ2luLmxvZ2dpbmdJbiA9IHRydWU7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogU3VjY2Vzc2Z1bGx5IGF1dGhlbnRpY2F0ZWRcblx0XHRcdCAqIEdvIHRvIGluaXRpYWxseSBpbnRlbmRlZCBhdXRoZW50aWNhdGVkIHBhdGhcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gcmVzcG9uc2Uge29iamVjdH0gcHJvbWlzZSByZXNwb25zZVxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2F1dGhTdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGxvZ2luLmxvZ2dpbmdJbiA9IGZhbHNlO1xuXG5cdFx0XHRcdGlmICgkcm9vdFNjb3BlLmF1dGhQYXRoKSB7XG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJHJvb3RTY29wZS5hdXRoUGF0aCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRfYXV0aC4kYXV0aFdpdGhPQXV0aFBvcHVwKHByb3ZpZGVyKVxuXHRcdFx0XHQudGhlbihfYXV0aFN1Y2Nlc3MpXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHRcdGxvZ2luLmxvZ2dpbmdJbiA9ICdlcnJvcic7XG5cdFx0XHRcdFx0bG9naW4ubG9naW5Nc2cgPSAnJ1xuXHRcdFx0XHR9KTtcblx0XHR9O1xuXHR9XG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==