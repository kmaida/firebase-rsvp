angular
	.module('myApp', ['firebase', 'ngRoute', 'ngResource', 'ngSanitize', 'ngMessages', 'ngCookies', 'mediaCheck', 'ui.bootstrap']);
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

		/**
		 * Determine if admin can be shown or if error message should be shown
		 *
		 * @private
		 */
		function _showAdmin() {
			admin.showAdmin = admin.user && (admin.user.uid === admin.data.master);
		}
		admin.data.$loaded().then(_showAdmin);

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

	validateDateFuture.$inject = ['$timeout', '$location', '$filter', 'Event'];

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

	authRun.$inject = ['$rootScope', '$cookies', '$location', 'Fire'];

	function authRun($rootScope, $cookies, $location, Fire) {
		$rootScope.$on('$routeChangeStart', function(event, next, current) {
			var _isAuthenticated = !!Fire.ref.getAuth();

			if (next && next.$$route) {

				console.log('next route:', next.$$route.originalPath, 'is next route secure:', !!next.$$route.secure, 'authenticated:', _isAuthenticated);

				// if not authenticated, redirect to login page
				// if possible, after login, redirect to intended route (large mq)
				if (next.$$route.secure && !_isAuthenticated) {

					console.log('save auth path:', next.$$route.originalPath);

					$cookies.authPath = next.$$route.originalPath;

					$rootScope.$evalAsync(function() {
						// send user to login
						$location.path('/login');
						$location.hash(null);
						$location.search('view', null);
					});
				}

				// if attempting to access /login route and already logged in, redirect to homepage
				if (next.$$route.originalPath === '/login' && _isAuthenticated) {
					$rootScope.$evalAsync(function() {
						$location.path('/');
					});
				}

				// if redirecting from Oauth, check to see if an intended route was saved
				// if intended secure route, login and then redirect
				// if no intended route, go to homepage
				if (current && current.$$route && current.$$route.originalPath === '/login' && _isAuthenticated) {
					$rootScope.$evalAsync(function() {
						if ($cookies.authPath) {
							$location.path($cookies.authPath);
						} else {
							$location.path('/');
						}
					});
				}

				// logged in and going to and from a secure route: clear cookie
				if (next && next.$$route && next.$$route.secure && current && current.$$route && current.$$route.secure && _isAuthenticated) {
					$cookies.authPath = undefined;
				}
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
				$location.hash(null);
				$location.search('view', null);
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

				$scope.$on('$locationChangeStart', _closeNav);
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

	LoginCtrl.$inject = ['Fire', '$scope', 'OAUTH', '$rootScope', '$location', 'localData', 'MQ', 'mediaCheck'];

	function LoginCtrl(Fire, $scope, OAUTH, $rootScope, $location, localData, MQ, mediaCheck) {
		// controllerAs ViewModel
		var login = this;

		// Firebase authentication
		var _auth = Fire.auth();

		/**
		 * Local data successfully retrieved
		 *
		 * @param data {json}
		 * @private
		 */
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

			/**
			 * Failed to authenticate
			 *
			 * @param error
			 * @private
			 */
			function _authError(error) {
				console.log(error.data);
				login.loggingIn = 'error';
				login.loginMsg = ''
			}

			/**
			 * Use popup to log in (large viewport)
			 *
			 * @private
			 */
			function _authWithPopup() {
				_auth.$authWithOAuthPopup(provider)
					.then(_authSuccess)
					.catch(_authError);
			}

			/**
			 * Use redirect to log in (small viewport)
			 *
			 * @private
			 */
			function _authWithRedirect() {
				_auth.$authWithOAuthRedirect(provider, _authError);
			}

			/**
			 * Initialize mediaCheck
			 * When small MQ, redirect with Oauth
			 * When large MQ, log in with Oauth popup
			 */
			mediaCheck.init({
				scope: $scope,
				mq: MQ.SMALL,
				enter: _authWithRedirect,
				exit: _authWithPopup
			});
		};
	}
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUuanMiLCJhY2NvdW50L0FjY291bnQuY3RybC5qcyIsImFkbWluL0FkbWluLmN0cmwuanMiLCJhZG1pbi9BZG1pbkV2ZW50TGlzdC5jdHJsLmpzIiwiYWRtaW4vRWRpdEV2ZW50LmN0cmwuanMiLCJhZG1pbi9ldmVudEZvcm0uZGlyLmpzIiwiYWRtaW4vdmFsaWRhdGVEYXRlRnV0dXJlLmRpci5qcyIsImFkbWluL3ZpZXdFdmVudEd1ZXN0cy5kaXIuanMiLCJjb3JlL0V2ZW50LmZhY3RvcnkuanMiLCJjb3JlL0ZpcmUuZmFjdG9yeS5qcyIsImNvcmUvTVEuY29uc3RhbnQuanMiLCJjb3JlL09BVVRILmNvbnN0YW50LmpzIiwiY29yZS9VdGlscy5mYWN0b3J5LmpzIiwiY29yZS9hcHAuYXV0aC5qcyIsImNvcmUvYXBwLmNvbmZpZy5qcyIsImNvcmUvZGV0ZWN0QWRCbG9jay5kaXIuanMiLCJjb3JlL2xvY2FsRGF0YS5zZXJ2aWNlLmpzIiwiY29yZS9tZWRpYUNoZWNrLnNlcnZpY2UuanMiLCJjb3JlL3RydXN0QXNIVE1MLmZpbHRlci5qcyIsImNvcmUvdmlld1N3aXRjaC5kaXIuanMiLCJldmVudC1kZXRhaWwvRXZlbnREZXRhaWwuY3RybC5qcyIsImV2ZW50LWRldGFpbC9yc3ZwRm9ybS5kaXIuanMiLCJldmVudHMvRXZlbnRzLmN0cmwuanMiLCJldmVudHMvcHJldHR5RGF0ZS5maWx0ZXIuanMiLCJoZWFkZXIvSGVhZGVyLmN0cmwuanMiLCJoZWFkZXIvbmF2Q29udHJvbC5kaXIuanMiLCJsb2dpbi9Mb2dpbi5jdHJsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im5nLWFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXJcblx0Lm1vZHVsZSgnbXlBcHAnLCBbJ2ZpcmViYXNlJywgJ25nUm91dGUnLCAnbmdSZXNvdXJjZScsICduZ1Nhbml0aXplJywgJ25nTWVzc2FnZXMnLCAnbmdDb29raWVzJywgJ21lZGlhQ2hlY2snLCAndWkuYm9vdHN0cmFwJ10pOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FjY291bnRDdHJsJywgQWNjb3VudEN0cmwpO1xuXG5cdEFjY291bnRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nLCAnRmlyZScsICdVdGlscycsICdPQVVUSCcsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIEFjY291bnRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBGaXJlLCBVdGlscywgT0FVVEgsICR0aW1lb3V0KSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhY2NvdW50ID0gdGhpcztcblxuXHRcdC8vIFRPRE86IHNob3cgdXNlcidzIGdlbmVyYWwgaW5mb3JtYXRpb25cblx0XHQvLyBUT0RPOiBzaG93IHVzZXIncyBSU1ZQc1xuXHRcdC8vIFRPRE86IHJlbW92ZSB0YWJzIChub3QgbmVjZXNzYXJ5KVxuXG5cdFx0YWNjb3VudC5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvLyBnZXQgdXNlciBzeW5jaHJvbm91c2x5IGFuZCBncmFiIG5lY2Vzc2FyeSBkYXRhIHRvIGRpc3BsYXlcblx0XHRhY2NvdW50LnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cdFx0YWNjb3VudC5sb2dpbnMgPSBPQVVUSC5MT0dJTlM7XG5cblx0XHR2YXIgX3Byb3ZpZGVyID0gYWNjb3VudC51c2VyLnByb3ZpZGVyO1xuXHRcdHZhciBfcHJvZmlsZSA9IGFjY291bnQudXNlcltfcHJvdmlkZXJdLmNhY2hlZFVzZXJQcm9maWxlO1xuXG5cdFx0YWNjb3VudC51c2VyTmFtZSA9IGFjY291bnQudXNlcltfcHJvdmlkZXJdLmRpc3BsYXlOYW1lO1xuXHRcdGFjY291bnQudXNlclBpY3R1cmUgPSBVdGlscy5nZXRVc2VyUGljdHVyZShhY2NvdW50LnVzZXIpO1xuXG5cdFx0dmFyIHJzdnBEYXRhID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0ZnVuY3Rpb24gX2dldE15UnN2cHMoZGF0YSkge1xuXHRcdFx0YWNjb3VudC5yc3ZwcyA9IFtdO1xuXG5cdFx0XHR2YXIgX2FsbFJzdnBzID0gZGF0YTtcblxuXHRcdFx0Zm9yICh2YXIgbiA9IDA7IG4gPCBfYWxsUnN2cHMubGVuZ3RoOyBuKyspIHtcblx0XHRcdFx0dmFyIF90aGlzID0gX2FsbFJzdnBzW25dO1xuXG5cdFx0XHRcdGlmIChfdGhpcy51c2VySWQgPT09IGFjY291bnQudXNlci51aWQpIHtcblx0XHRcdFx0XHRhY2NvdW50LnJzdnBzLnB1c2goX3RoaXMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGFjY291bnQucnN2cHNSZWFkeSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cnN2cERhdGEuJGxvYWRlZCgpLnRoZW4oX2dldE15UnN2cHMpO1xuXG5cdFx0dmFyIF90YWIgPSAkbG9jYXRpb24uc2VhcmNoKCkudmlldztcblxuXHRcdGFjY291bnQudGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1VzZXIgSW5mbycsXG5cdFx0XHRcdHF1ZXJ5OiAndXNlci1pbmZvJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1JTVlBzJyxcblx0XHRcdFx0cXVlcnk6ICdyc3Zwcydcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0YWNjb3VudC5jdXJyZW50VGFiID0gX3RhYiA/IF90YWIgOiAndXNlci1pbmZvJztcblxuXHRcdC8qKlxuXHRcdCAqIENoYW5nZSB0YWJzIGJ5IHdhdGNoaW5nIGZvciByb3V0ZSB1cGRhdGVcblx0XHQgKi9cblx0XHQkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgbmV4dCkge1xuXHRcdFx0YWNjb3VudC5jdXJyZW50VGFiID0gbmV4dC5wYXJhbXMudmlldyB8fCAndXNlci1pbmZvJztcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCB1c2VyJ3MgcHJvZmlsZSBpbmZvcm1hdGlvblxuXHRcdCAqL1xuXHRcdGFjY291bnQuZ2V0UHJvZmlsZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIHVzZXIncyBwcm9maWxlIGRhdGFcblx0XHRcdCAqIFNob3cgQWNjb3VudCBVSVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldFVzZXJTdWNjZXNzKGRhdGEpIHtcblx0XHRcdFx0YWNjb3VudC51c2VyID0gZGF0YTtcblx0XHRcdFx0YWNjb3VudC5hZG1pbmlzdHJhdG9yID0gYWNjb3VudC51c2VyLmlzQWRtaW47XG5cdFx0XHRcdGFjY291bnQubGlua2VkQWNjb3VudHMgPSBVc2VyLmdldExpbmtlZEFjY291bnRzKGFjY291bnQudXNlciwgJ2FjY291bnQnKTtcblx0XHRcdFx0YWNjb3VudC5zaG93QWNjb3VudCA9IHRydWU7XG5cdFx0XHRcdGFjY291bnQucnN2cHMgPSBhY2NvdW50LnVzZXIucnN2cHM7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIGVycm9yIEFQSSBjYWxsIGdldHRpbmcgdXNlcidzIHByb2ZpbGUgZGF0YVxuXHRcdFx0ICogU2hvdyBhbiBlcnJvciBhbGVydCBpbiB0aGUgVUlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gZXJyb3Jcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9nZXRVc2VyRXJyb3IoZXJyb3IpIHtcblx0XHRcdFx0YWNjb3VudC5lcnJvckdldHRpbmdVc2VyID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0dXNlckRhdGEuZ2V0VXNlcigpLnRoZW4oX2dldFVzZXJTdWNjZXNzLCBfZ2V0VXNlckVycm9yKTtcblx0XHR9O1xuXG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignQWRtaW5DdHJsJywgQWRtaW5DdHJsKTtcblxuXHRBZG1pbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdGaXJlJ107XG5cblx0ZnVuY3Rpb24gQWRtaW5DdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBGaXJlKSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhZG1pbiA9IHRoaXM7XG5cblx0XHRhZG1pbi51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2Vcblx0XHRhZG1pbi5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvKipcblx0XHQgKiBEZXRlcm1pbmUgaWYgYWRtaW4gY2FuIGJlIHNob3duIG9yIGlmIGVycm9yIG1lc3NhZ2Ugc2hvdWxkIGJlIHNob3duXG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9zaG93QWRtaW4oKSB7XG5cdFx0XHRhZG1pbi5zaG93QWRtaW4gPSBhZG1pbi51c2VyICYmIChhZG1pbi51c2VyLnVpZCA9PT0gYWRtaW4uZGF0YS5tYXN0ZXIpO1xuXHRcdH1cblx0XHRhZG1pbi5kYXRhLiRsb2FkZWQoKS50aGVuKF9zaG93QWRtaW4pO1xuXG5cdFx0dmFyIF90YWIgPSAkbG9jYXRpb24uc2VhcmNoKCkudmlldztcblxuXHRcdGFkbWluLnRhYnMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6ICdFdmVudHMnLFxuXHRcdFx0XHRxdWVyeTogJ2V2ZW50cydcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6ICdBZGQgRXZlbnQnLFxuXHRcdFx0XHRxdWVyeTogJ2FkZC1ldmVudCdcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0YWRtaW4uY3VycmVudFRhYiA9IF90YWIgPyBfdGFiIDogJ2V2ZW50cyc7XG5cblx0XHQvKipcblx0XHQgKiBDaGFuZ2UgdGFicyBieSB3YXRjaGluZyBmb3Igcm91dGUgdXBkYXRlXG5cdFx0ICovXG5cdFx0JHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIG5leHQpIHtcblx0XHRcdGFkbWluLmN1cnJlbnRUYWIgPSBuZXh0LnBhcmFtcy52aWV3IHx8ICdldmVudHMnO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0ICogU2hvdyBSU1ZQZWQgZ3Vlc3QgbW9kYWxcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudElkIHtzdHJpbmd9IGV2ZW50IElEIHRvIGdldCBSU1ZQcyBmb3Jcblx0XHQgKiBAcGFyYW0gZXZlbnROYW1lIHtzdHJpbmd9IGV2ZW50IG5hbWUgdG8gZ2V0IFJTVlBzIGZvclxuXHRcdCAqL1xuXHRcdGFkbWluLnNob3dHdWVzdHMgPSBmdW5jdGlvbihldmVudElkLCBldmVudE5hbWUpIHtcblx0XHRcdGFkbWluLnNob3dHdWVzdHNFdmVudElkID0gZXZlbnRJZDtcblx0XHRcdGFkbWluLnNob3dHdWVzdHNFdmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0XHRhZG1pbi5zaG93TW9kYWwgPSB0cnVlO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignQWRtaW5FdmVudExpc3RDdHJsJywgQWRtaW5FdmVudExpc3RDdHJsKTtcblxuXHRBZG1pbkV2ZW50TGlzdEN0cmwuJGluamVjdCA9IFsnRmlyZScsICckbG9jYXRpb24nLCAnJHRpbWVvdXQnLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBBZG1pbkV2ZW50TGlzdEN0cmwoRmlyZSwgJGxvY2F0aW9uLCAkdGltZW91dCwgRXZlbnQpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGFFdnQgPSB0aGlzO1xuXG5cdFx0YUV2dC5ldnRVcmwgPSAkbG9jYXRpb24ucHJvdG9jb2woKSArICc6Ly8nICsgJGxvY2F0aW9uLmhvc3QoKSArICcvZXZlbnQvJztcblxuXHRcdC8qKlxuXHRcdCAqIEhpZGUgVVJMIGlucHV0IGZpZWxkIHdoZW4gYmx1cnJlZFxuXHRcdCAqL1xuXHRcdGFFdnQuYmx1clVybElucHV0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRhRXZ0LmNvcHlJbnB1dCA9IG51bGw7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFNob3cgVVJMIGlucHV0IGZpZWxkIHdoZW4gSUQgbGluayBpcyBjbGlja2VkXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gaW5kZXhcblx0XHQgKi9cblx0XHRhRXZ0LnNob3dVcmxJbnB1dCA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRhRXZ0LmNvcHlJbnB1dCA9IGluZGV4O1xuXG5cdFx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0YW5ndWxhci5lbGVtZW50KCcjZScgKyBpbmRleCkuZmluZCgnaW5wdXQnKS5zZWxlY3QoKTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQvLyBnZXQgZXZlbnRzIGZyb20gRmlyZWJhc2Vcblx0XHRhRXZ0LmV2ZW50cyA9IEZpcmUuZXZlbnRzKCk7XG5cblx0XHQvKipcblx0XHQgKiBDdXN0b20gc29ydCBmdW5jdGlvblxuXHRcdCAqIEdldCBldmVudCBzdGFydCBkYXRlIGFuZCBjaGFuZ2UgdG8gcmVhbCBkYXRlIHRvIHNvcnQgYnlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldnQge29iamVjdH0gZXZlbnQgb2JqZWN0XG5cdFx0ICogQHJldHVybnMge0RhdGV9XG5cdFx0ICovXG5cdFx0YUV2dC5zb3J0U3RhcnREYXRlID0gZnVuY3Rpb24oZXZ0KSB7XG5cdFx0XHRyZXR1cm4gRXZlbnQuZ2V0SlNEYXRldGltZShldnQuc3RhcnREYXRlLCBldnQuc3RhcnRUaW1lKTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0VkaXRFdmVudEN0cmwnLCBFZGl0RXZlbnRDdHJsKTtcblxuXHRFZGl0RXZlbnRDdHJsLiRpbmplY3QgPSBbJ0ZpcmUnLCAnJHJvdXRlUGFyYW1zJywgJyRsb2NhdGlvbicsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIEVkaXRFdmVudEN0cmwoRmlyZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sICR0aW1lb3V0KSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBlZGl0ID0gdGhpcztcblxuXHRcdC8vIGdldCB0aGUgZXZlbnQgSURcblx0XHR2YXIgX2V2ZW50SWQgPSAkcm91dGVQYXJhbXMuZXZlbnRJZDtcblxuXHRcdC8vIGdldCBldmVudHNcblx0XHR2YXIgZXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdC8vIHRhYnNcblx0XHRlZGl0LnRhYnMgPSBbJ1VwZGF0ZSBEZXRhaWxzJywgJ0RlbGV0ZSBFdmVudCddO1xuXHRcdGVkaXQuY3VycmVudFRhYiA9IDA7XG5cblx0XHQvKipcblx0XHQgKiBTd2l0Y2ggdGFic1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGluZGV4IHtudW1iZXJ9IHRhYiBpbmRleFxuXHRcdCAqL1xuXHRcdGVkaXQuY2hhbmdlVGFiID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGVkaXQuY3VycmVudFRhYiA9IGluZGV4O1xuXHRcdH07XG5cblx0XHQvLyBzeW5jaHJvbm91c2x5IHJldHJpZXZlIHVzZXIgZGF0YVxuXHRcdGVkaXQudXNlciA9IEZpcmUucmVmLmdldEF1dGgoKTtcblxuXHRcdC8vIGdldCBkYXRhIGZyb20gdGhlIGRhdGFiYXNlXG5cdFx0ZWRpdC5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIHNpbmdsZSBldmVudCBkZXRhaWxcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IGV2ZW50cyBkYXRhXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZXZlbnRTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGVkaXQuZWRpdEV2ZW50ID0gZXZlbnRzLiRnZXRSZWNvcmQoX2V2ZW50SWQpO1xuXHRcdFx0ZWRpdC5zaG93RWRpdEZvcm0gPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50cy4kbG9hZGVkKF9ldmVudFN1Y2Nlc3MpO1xuXG5cdFx0LyoqXG5cdFx0ICogUmVzZXQgdGhlIGRlbGV0ZSBidXR0b24gdG8gZGVmYXVsdCBzdGF0ZVxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfYnRuRGVsZXRlUmVzZXQoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZSA9IGZhbHNlO1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0ZSBFdmVudCc7XG5cdFx0fVxuXG5cdFx0X2J0bkRlbGV0ZVJlc2V0KCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiByZXR1cm5lZCBvbiBzdWNjZXNzZnVsIGRlbGV0aW9uIG9mIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9kZWxldGVTdWNjZXNzKCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0ZWQhJztcblx0XHRcdGVkaXQuYnRuRGVsZXRlID0gdHJ1ZTtcblx0XHRcdGVkaXQuZWRpdEV2ZW50ID0ge307XG5cblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2FkbWluJyk7XG5cdFx0XHR9LCAxNTAwKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiByZXR1cm5lZCBvbiBlcnJvciBkZWxldGluZyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZGVsZXRlRXJyb3IoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRXJyb3IgZGVsZXRpbmchJztcblxuXHRcdFx0JHRpbWVvdXQoX2J0bkRlbGV0ZVJlc2V0LCAzMDAwKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZWxldGUgdGhlIGV2ZW50XG5cdFx0ICovXG5cdFx0ZWRpdC5kZWxldGVFdmVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJzdnBzID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRGVsZXRpbmcuLi4nO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIERlbGV0ZSBhbGwgUlNWUHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkZWxldGVkIGV2ZW50XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2RlbGV0ZVJzdnBzKCkge1xuXHRcdFx0XHRhbmd1bGFyLmZvckVhY2gocnN2cHMsIGZ1bmN0aW9uKHJzdnApIHtcblx0XHRcdFx0XHRpZiAocnN2cC5ldmVudElkID09PSBlZGl0LmVkaXRFdmVudC4kaWQpIHtcblx0XHRcdFx0XHRcdHJzdnBzLiRyZW1vdmUocnN2cCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHJzdnBzLiRsb2FkZWQoKS50aGVuKF9kZWxldGVSc3Zwcyk7XG5cblx0XHRcdC8vIGRlbGV0ZSB0aGUgZXZlbnRcblx0XHRcdGV2ZW50cy4kcmVtb3ZlKGVkaXQuZWRpdEV2ZW50KS50aGVuKF9kZWxldGVTdWNjZXNzLCBfZGVsZXRlRXJyb3IpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdldmVudEZvcm0nLCBldmVudEZvcm0pO1xuXG5cdGV2ZW50Rm9ybS4kaW5qZWN0ID0gWydGaXJlJywgJyR0aW1lb3V0JywgJyRsb2NhdGlvbicsICckZmlsdGVyJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gZXZlbnRGb3JtKEZpcmUsICR0aW1lb3V0LCAkbG9jYXRpb24sICRmaWx0ZXIsIEV2ZW50KSB7XG5cblx0XHRldmVudEZvcm1DdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG5cdFx0ZnVuY3Rpb24gZXZlbnRGb3JtQ3RybCgkc2NvcGUpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBzeW50YXhcblx0XHRcdHZhciBlZiA9IHRoaXM7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGZvcm0gaXMgY3JlYXRlIG9yIGVkaXRcblx0XHRcdHZhciBfaXNDcmVhdGUgPSAhIWVmLnByZWZpbGxNb2RlbElkID09PSBmYWxzZTtcblx0XHRcdHZhciBfaXNFZGl0ID0gISFlZi5wcmVmaWxsTW9kZWxJZCA9PT0gdHJ1ZTtcblxuXHRcdFx0dmFyIGV2ZW50cyA9IEZpcmUuZXZlbnRzKCk7XG5cblx0XHRcdGVmLnRpbWVSZWdleCA9IC9eKDA/WzEtOV18MVswMTJdKSg6WzAtNV1cXGQpIFtBUGFwXVttTV0kL2k7XG5cblx0XHRcdGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdGV2ZW50cy4kbG9hZGVkKCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0ZWYuZm9ybU1vZGVsID0gZXZlbnRzLiRnZXRSZWNvcmQoZWYucHJlZmlsbE1vZGVsSWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gcHJldmVudCBzZWxlY3RpbmcgZGF0ZXMgaW4gdGhlIHBhc3Rcblx0XHRcdGVmLm1pbkRhdGUgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0XHRlZi5kYXRlT3B0aW9ucyA9IHtcblx0XHRcdFx0c2hvd1dlZWtzOiBmYWxzZVxuXHRcdFx0fTtcblxuXHRcdFx0ZWYuc3RhcnREYXRlT3BlbiA9IGZhbHNlO1xuXHRcdFx0ZWYuZW5kRGF0ZU9wZW4gPSBmYWxzZTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUb2dnbGUgdGhlIGRhdGVwaWNrZXIgb3Blbi9jbG9zZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gJGV2ZW50IHtvYmplY3R9XG5cdFx0XHQgKiBAcGFyYW0gZGF0ZU5hbWUge3N0cmluZ30gc3RhcnREYXRlIC8gZW5kRGF0ZVxuXHRcdFx0ICovXG5cdFx0XHRlZi50b2dnbGVEYXRlcGlja2VyID0gZnVuY3Rpb24oJGV2ZW50LCBkYXRlTmFtZSkge1xuXHRcdFx0XHQkZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0JGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdFx0XHRcdGVmW2RhdGVOYW1lICsgJ09wZW4nXSA9ICFlZltkYXRlTmFtZSArICdPcGVuJ107XG5cdFx0XHR9O1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFRyYW5zZm9ybSBkYXRlcyB0byBhIGZvcm1hdCBBbmd1bGFyRmlyZSB3aWxsIHNhdmUgdG8gRmlyZWJhc2Vcblx0XHRcdCAqIEFuZ3VsYXJGaXJlIHdvbnRmaXggYnVnOiBodHRwczovL2dpdGh1Yi5jb20vZmlyZWJhc2UvYW5ndWxhcmZpcmUvaXNzdWVzLzM4MVxuXHRcdFx0ICpcblx0XHRcdCAqIEByZXR1cm4ge3N0cmluZ30gbW0vZGQveXl5eVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZm9ybWF0RGF0ZShkYXRlKSB7XG5cdFx0XHRcdHJldHVybiAkZmlsdGVyKCdkYXRlJykoZGF0ZSwgJ01NL2RkL3l5eXknKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBPbiBzdGFydCBkYXRlIHZhbGlkIGJsdXIsIHVwZGF0ZSBlbmQgZGF0ZSBpZiBlbXB0eVxuXHRcdFx0ICovXG5cdFx0XHRlZi5zdGFydERhdGVCbHVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChlZi5mb3JtTW9kZWwgJiYgZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSAmJiAhZWYuZm9ybU1vZGVsLmVuZERhdGUpIHtcblx0XHRcdFx0XHRlZi5mb3JtTW9kZWwuZW5kRGF0ZSA9IF9mb3JtYXREYXRlKGVmLmZvcm1Nb2RlbC5zdGFydERhdGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJlc2V0IHRoZSBzdGF0ZSBvZiB0aGUgZm9ybSBTdWJtaXQgYnV0dG9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2J0blN1Ym1pdFJlc2V0KCkge1xuXHRcdFx0XHRlZi5idG5TYXZlZCA9IGZhbHNlO1xuXHRcdFx0XHRlZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1N1Ym1pdCcgOiAnVXBkYXRlJztcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHbyB0byBFdmVudHMgdGFiXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dvVG9FdmVudHMoKSB7XG5cdFx0XHRcdCRsb2NhdGlvbi5zZWFyY2goJ3ZpZXcnLCAnZXZlbnRzJyk7XG5cdFx0XHR9XG5cblx0XHRcdF9idG5TdWJtaXRSZXNldCgpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBldmVudCBBUEkgY2FsbCBzdWNjZWVkZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXZlbnRTdWNjZXNzKHJlZikge1xuXHRcdFx0XHRlZi5idG5TYXZlZCA9IHRydWU7XG5cdFx0XHRcdGVmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU2F2ZWQhJyA6ICdVcGRhdGVkISc7XG5cblx0XHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRcdGVmLnNob3dSZWRpcmVjdE1zZyA9IHRydWU7XG5cdFx0XHRcdFx0JHRpbWVvdXQoX2dvVG9FdmVudHMsIDI1MDApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHRlZi5zaG93VXBkYXRlRGV0YWlsTGluayA9IHRydWU7XG5cdFx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAyNTAwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBldmVudCBBUEkgY2FsbCBlcnJvclxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9ldmVudEVycm9yKGVycikge1xuXHRcdFx0XHRlZi5idG5TYXZlZCA9ICdlcnJvcic7XG5cdFx0XHRcdGVmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnRXJyb3Igc2F2aW5nIScgOiAnRXJyb3IgdXBkYXRpbmchJztcblxuXHRcdFx0XHRjb25zb2xlLmxvZyhlZi5idG5TdWJtaXRUZXh0LCBlcnIpO1xuXG5cdFx0XHRcdCR0aW1lb3V0KF9idG5TdWJtaXRSZXNldCwgMzAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2hlY2sgaWYgZXZlbnQgc3RhcnQgYW5kIGVuZCBkYXRldGltZXMgYXJlIGEgdmFsaWQgcmFuZ2Vcblx0XHRcdCAqIFJ1bnMgb24gYmx1ciBvZiBldmVudCBkYXRlcy90aW1lc1xuXHRcdFx0ICpcblx0XHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHRcdFx0ICovXG5cdFx0XHRlZi52YWxpZGF0ZURhdGVyYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoZWYuZm9ybU1vZGVsICYmIGVmLmZvcm1Nb2RlbC5zdGFydERhdGUgJiYgZWYuZm9ybU1vZGVsLnN0YXJ0VGltZSAmJiBlZi5mb3JtTW9kZWwuZW5kRGF0ZSAmJiBlZi5mb3JtTW9kZWwuZW5kVGltZSkge1xuXHRcdFx0XHRcdHZhciBzdGFydERhdGV0aW1lID0gRXZlbnQuZ2V0SlNEYXRldGltZShlZi5mb3JtTW9kZWwuc3RhcnREYXRlLCBlZi5mb3JtTW9kZWwuc3RhcnRUaW1lKSxcblx0XHRcdFx0XHRcdGVuZERhdGV0aW1lID0gRXZlbnQuZ2V0SlNEYXRldGltZShlZi5mb3JtTW9kZWwuZW5kRGF0ZSwgZWYuZm9ybU1vZGVsLmVuZFRpbWUpO1xuXG5cdFx0XHRcdFx0ZWYudmFsaWREYXRlcmFuZ2UgPSAoc3RhcnREYXRldGltZSAtIGVuZERhdGV0aW1lKSA8IDA7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgc3VibWl0IGJ1dHRvblxuXHRcdFx0ICogU3VibWl0IG5ldyBldmVudCB0byBBUElcblx0XHRcdCAqIEZvcm0gQCBldmVudEZvcm0udHBsLmh0bWxcblx0XHRcdCAqL1xuXHRcdFx0ZWYuc3VibWl0RXZlbnQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0ZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSA9IF9mb3JtYXREYXRlKGVmLmZvcm1Nb2RlbC5zdGFydERhdGUpO1xuXHRcdFx0XHRlZi5mb3JtTW9kZWwuZW5kRGF0ZSA9IF9mb3JtYXREYXRlKGVmLmZvcm1Nb2RlbC5lbmREYXRlKTtcblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogVXBkYXRlIFJTVlBzIGF0dGFjaGVkIHRvIHRoaXMgZXZlbnRcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogQHByaXZhdGVcblx0XHRcdFx0ICovXG5cdFx0XHRcdGZ1bmN0aW9uIF91cGRhdGVSc3ZwcygpIHtcblx0XHRcdFx0XHRhbmd1bGFyLmZvckVhY2gocnN2cHMsIGZ1bmN0aW9uKHJzdnApIHtcblx0XHRcdFx0XHRcdGlmIChyc3ZwLmV2ZW50SWQgPT09IGVmLmZvcm1Nb2RlbC4kaWQgJiYgcnN2cC5ldmVudE5hbWUgIT09IGVmLmZvcm1Nb2RlbC50aXRsZSkge1xuXHRcdFx0XHRcdFx0XHRyc3ZwLmV2ZW50TmFtZSA9IGVmLmZvcm1Nb2RlbC50aXRsZTtcblx0XHRcdFx0XHRcdFx0cnN2cHMuJHNhdmUocnN2cCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0ZXZlbnRzLiRhZGQoZWYuZm9ybU1vZGVsKS50aGVuKF9ldmVudFN1Y2Nlc3MsIF9ldmVudEVycm9yKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHR2YXIgcnN2cHMgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdFx0XHRyc3Zwcy4kbG9hZGVkKCkudGhlbihfdXBkYXRlUnN2cHMpO1xuXHRcdFx0XHRcdGV2ZW50cy4kc2F2ZShlZi5mb3JtTW9kZWwpLnRoZW4oX2V2ZW50U3VjY2VzcywgX2V2ZW50RXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdHByZWZpbGxNb2RlbElkOiAnQCdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJy9uZy1hcHAvYWRtaW4vZXZlbnRGb3JtLnRwbC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6IGV2ZW50Rm9ybUN0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdlZicsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgndmFsaWRhdGVEYXRlRnV0dXJlJywgdmFsaWRhdGVEYXRlRnV0dXJlKTtcblxuXHR2YWxpZGF0ZURhdGVGdXR1cmUuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRmaWx0ZXInLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiB2YWxpZGF0ZURhdGVGdXR1cmUoKSB7XG5cblx0XHR2YWxpZGF0ZURhdGVGdXR1cmVMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbScsICckYXR0cnMnLCAnbmdNb2RlbCddO1xuXG5cdFx0ZnVuY3Rpb24gdmFsaWRhdGVEYXRlRnV0dXJlTGluaygkc2NvcGUsICRlbGVtLCAkYXR0cnMsIG5nTW9kZWwpIHtcblx0XHRcdHZhciBfbm93ID0gbmV3IERhdGUoKSxcblx0XHRcdFx0X3llc3RlcmRheSA9IF9ub3cuc2V0RGF0ZShfbm93LmdldERhdGUoKSAtIDEpO1xuXG5cdFx0XHRuZ01vZGVsLiRwYXJzZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIF9kID0gRGF0ZS5wYXJzZSh2YWx1ZSksXG5cdFx0XHRcdFx0X3ZhbGlkID0gX3llc3RlcmRheSAtIF9kIDwgMDtcblxuXHRcdFx0XHRuZ01vZGVsLiRzZXRWYWxpZGl0eSgncGFzdERhdGUnLCBfdmFsaWQpO1xuXG5cdFx0XHRcdHJldHVybiBfdmFsaWQgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcblx0XHRcdH0pO1xuXG5cdFx0XHRuZ01vZGVsLiRmb3JtYXR0ZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIF9kID0gRGF0ZS5wYXJzZSh2YWx1ZSksXG5cdFx0XHRcdFx0X3ZhbGlkID0gX3llc3RlcmRheSAtIF9kIDwgMDtcblxuXHRcdFx0XHRuZ01vZGVsLiRzZXRWYWxpZGl0eSgncGFzdERhdGUnLCBfdmFsaWQpO1xuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IHZhbGlkYXRlRGF0ZUZ1dHVyZUxpbmtcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCd2aWV3RXZlbnRHdWVzdHMnLCB2aWV3RXZlbnRHdWVzdHMpO1xuXG5cdHZpZXdFdmVudEd1ZXN0cy4kaW5qZWN0ID0gWydGaXJlJ107XG5cblx0ZnVuY3Rpb24gdmlld0V2ZW50R3Vlc3RzKEZpcmUpIHtcblxuXHRcdHZpZXdFdmVudEd1ZXN0c0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHRmdW5jdGlvbiB2aWV3RXZlbnRHdWVzdHNDdHJsKCRzY29wZSkge1xuXHRcdFx0Ly8gY29udHJvbGxlckFzIHN5bnRheFxuXHRcdFx0dmFyIGcgPSB0aGlzO1xuXG5cdFx0XHR2YXIgcnN2cERhdGEgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwRGF0YUxvYWRlZChkYXRhKSB7XG5cdFx0XHRcdHZhciBfYWxsUnN2cHMgPSBkYXRhO1xuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZXQgdXAgZ3Vlc3RsaXN0IGZvciB2aWV3XG5cdFx0XHRcdCAqIFNldCB1cCBndWVzdCBjb3VudHMgZm9yIHZpZXdcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogQHBhcmFtIGV2ZW50R3Vlc3RzIHtBcnJheX0gZ3Vlc3RzIHdobyBoYXZlIFJTVlBlZCB0byBzcGVjaWZpYyBldmVudFxuXHRcdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0XHQgKi9cblx0XHRcdFx0ZnVuY3Rpb24gX3Nob3dFdmVudEd1ZXN0cyhldmVudEd1ZXN0cykge1xuXHRcdFx0XHRcdHZhciBfdG90YWxHdWVzdHMgPSAwO1xuXG5cdFx0XHRcdFx0Zy5ndWVzdHMgPSBldmVudEd1ZXN0cztcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZy5ndWVzdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHZhciBfdGhpc0d1ZXN0ID0gZy5ndWVzdHNbaV07XG5cblx0XHRcdFx0XHRcdGlmIChfdGhpc0d1ZXN0LmF0dGVuZGluZykge1xuXHRcdFx0XHRcdFx0XHRfdG90YWxHdWVzdHMgKz0gX3RoaXNHdWVzdC5ndWVzdHM7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Zy50b3RhbEd1ZXN0cyA9IF90b3RhbEd1ZXN0cztcblx0XHRcdFx0XHRnLmd1ZXN0c1JlYWR5ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiAkd2F0Y2ggZXZlbnQgSUQgYW5kIGNvbGxlY3QgdXBkYXRlZCBzZXRzIG9mIGd1ZXN0c1xuXHRcdFx0XHQgKi9cblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgnZy5ldmVudElkJywgZnVuY3Rpb24gKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRcdFx0aWYgKG5ld1ZhbCkge1xuXHRcdFx0XHRcdFx0dmFyIF9ldmVudEd1ZXN0cyA9IFtdO1xuXHRcdFx0XHRcdFx0Zy5ndWVzdHNSZWFkeSA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBuID0gMDsgbiA8IF9hbGxSc3Zwcy5sZW5ndGg7IG4rKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgX3RoaXNHdWVzdCA9IF9hbGxSc3Zwc1tuXTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoX3RoaXNHdWVzdC5ldmVudElkID09PSBnLmV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdFx0XHRfZXZlbnRHdWVzdHMucHVzaChfdGhpc0d1ZXN0KTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRfc2hvd0V2ZW50R3Vlc3RzKF9ldmVudEd1ZXN0cyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0cnN2cERhdGEuJGxvYWRlZCgpLnRoZW4oX3JzdnBEYXRhTG9hZGVkKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbG9zZSB0aGlzIG1vZGFsIGRpcmVjdGl2ZVxuXHRcdFx0ICovXG5cdFx0XHRnLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Zy5zaG93TW9kYWwgPSBmYWxzZTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZXZlbnRJZDogJz0nLFxuXHRcdFx0XHRldmVudE5hbWU6ICc9Jyxcblx0XHRcdFx0c2hvd01vZGFsOiAnPSdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJy9uZy1hcHAvYWRtaW4vdmlld0V2ZW50R3Vlc3RzLnRwbC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6IHZpZXdFdmVudEd1ZXN0c0N0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdnJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9XG5cdH1cbn0pKCk7IiwiLy8gRXZlbnQgZnVuY3Rpb25zXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5mYWN0b3J5KCdFdmVudCcsIEV2ZW50KTtcblxuXHRFdmVudC4kaW5qZWN0ID0gWydVdGlscycsICckZmlsdGVyJ107XG5cblx0ZnVuY3Rpb24gRXZlbnQoVXRpbHMsICRmaWx0ZXIpIHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIHByZXR0eSBkYXRlIGZvciBVSSBkaXNwbGF5IGZyb20gdGhlIHN0YXJ0IGFuZCBlbmQgZGF0ZXRpbWVzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRPYmoge29iamVjdH0gdGhlIGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IHByZXR0eSBzdGFydCBhbmQgZW5kIGRhdGUgLyB0aW1lIHN0cmluZ1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldFByZXR0eURhdGV0aW1lKGV2ZW50T2JqKSB7XG5cdFx0XHR2YXIgc3RhcnREYXRlID0gZXZlbnRPYmouc3RhcnREYXRlLFxuXHRcdFx0XHRzdGFydEQgPSBuZXcgRGF0ZShzdGFydERhdGUpLFxuXHRcdFx0XHRzdGFydFRpbWUgPSBldmVudE9iai5zdGFydFRpbWUsXG5cdFx0XHRcdGVuZERhdGUgPSBldmVudE9iai5lbmREYXRlLFxuXHRcdFx0XHRlbmREID0gbmV3IERhdGUoZW5kRGF0ZSksXG5cdFx0XHRcdGVuZFRpbWUgPSBldmVudE9iai5lbmRUaW1lLFxuXHRcdFx0XHRkYXRlRm9ybWF0U3RyID0gJ01NTSBkIHl5eXknLFxuXHRcdFx0XHRwcmV0dHlTdGFydERhdGUgPSAkZmlsdGVyKCdkYXRlJykoc3RhcnRELCBkYXRlRm9ybWF0U3RyKSxcblx0XHRcdFx0cHJldHR5RW5kRGF0ZSA9ICRmaWx0ZXIoJ2RhdGUnKShlbmRELCBkYXRlRm9ybWF0U3RyKSxcblx0XHRcdFx0cHJldHR5RGF0ZXRpbWU7XG5cblx0XHRcdGlmIChwcmV0dHlTdGFydERhdGUgPT09IHByZXR0eUVuZERhdGUpIHtcblx0XHRcdFx0Ly8gZXZlbnQgc3RhcnRzIGFuZCBlbmRzIG9uIHRoZSBzYW1lIGRheVxuXHRcdFx0XHQvLyBBcHIgMjkgMjAxNSwgMTI6MDAgUE0gLSA1OjAwIFBNXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lID0gcHJldHR5U3RhcnREYXRlICsgJywgJyArIHN0YXJ0VGltZSArICcgLSAnICsgZW5kVGltZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIGV2ZW50IHN0YXJ0cyBhbmQgZW5kcyBvbiBkaWZmZXJlbnQgZGF5c1xuXHRcdFx0XHQvLyBEZWMgMzEgMjAxNCwgODowMCBQTSAtIEphbiAxIDIwMTUsIDExOjAwIEFNXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lID0gcHJldHR5U3RhcnREYXRlICsgJywgJyArIHN0YXJ0VGltZSArICcgLSAnICsgcHJldHR5RW5kRGF0ZSArICcsICcgKyBlbmRUaW1lO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcHJldHR5RGF0ZXRpbWU7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogR2V0IEphdmFTY3JpcHQgRGF0ZSBmcm9tIGV2ZW50IGRhdGUgYW5kIHRpbWUgc3RyaW5nc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGVTdHIge3N0cmluZ30gbW0vZGQveXl5XG5cdFx0ICogQHBhcmFtIHRpbWVTdHIge3N0cmluZ30gaGg6bW0gQU0vUE1cblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRKU0RhdGV0aW1lKGRhdGVTdHIsIHRpbWVTdHIpIHtcblx0XHRcdHZhciBkID0gbmV3IERhdGUoZGF0ZVN0ciksXG5cdFx0XHRcdHRpbWVBcnIgPSB0aW1lU3RyLnNwbGl0KCcgJyksXG5cdFx0XHRcdHRpbWUgPSB0aW1lQXJyWzBdLnNwbGl0KCc6JyksXG5cdFx0XHRcdGhvdXJzID0gdGltZVswXSAqIDEsXG5cdFx0XHRcdG1pbnV0ZXMgPSB0aW1lWzFdICogMSxcblx0XHRcdFx0YW1wbSA9IHRpbWVBcnJbMV0sXG5cdFx0XHRcdGZ1bGxkYXRlO1xuXG5cdFx0XHRpZiAoYW1wbSA9PSAnUE0nKSB7XG5cdFx0XHRcdGlmIChob3VycyAhPT0gMTIpIHtcblx0XHRcdFx0XHRob3VycyA9IGhvdXJzICsgMTI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVsbGRhdGUgPSBuZXcgRGF0ZShkLmdldEZ1bGxZZWFyKCksIGQuZ2V0TW9udGgoKSwgZC5nZXREYXRlKCksIGhvdXJzLCBtaW51dGVzKTtcblxuXHRcdFx0cmV0dXJuIGZ1bGxkYXRlO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZSBpZiBldmVudCBpcyBleHBpcmVkXG5cdFx0ICogKGVuZCBkYXRlL3RpbWUgaGFzIHBhc3NlZCBjdXJyZW50IGRhdGUvdGltZSlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldnQge29iamVjdH0gZXZlbnQgb2JqZWN0XG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZXhwaXJlZChldnQpIHtcblx0XHRcdHZhciBqc1N0YXJ0RGF0ZSA9IGdldEpTRGF0ZXRpbWUoZXZ0LmVuZERhdGUsIGV2dC5lbmRUaW1lKSxcblx0XHRcdFx0bm93ID0gbmV3IERhdGUoKTtcblxuXHRcdFx0cmV0dXJuIGpzU3RhcnREYXRlIDwgbm93O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRQcmV0dHlEYXRldGltZTogZ2V0UHJldHR5RGF0ZXRpbWUsXG5cdFx0XHRnZXRKU0RhdGV0aW1lOiBnZXRKU0RhdGV0aW1lLFxuXHRcdFx0ZXhwaXJlZDogZXhwaXJlZFxuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnRmlyZScsIEZpcmUpO1xuXG5cdEZpcmUuJGluamVjdCA9IFsnJGZpcmViYXNlQXV0aCcsICckZmlyZWJhc2VPYmplY3QnLCAnJGZpcmViYXNlQXJyYXknXTtcblxuXHRmdW5jdGlvbiBGaXJlKCRmaXJlYmFzZUF1dGgsICRmaXJlYmFzZU9iamVjdCwgJGZpcmViYXNlQXJyYXkpIHtcblxuXHRcdHZhciB1cmkgPSAnaHR0cHM6Ly9pbnRlbnNlLWhlYXQtNTgyMi5maXJlYmFzZWlvLmNvbS8nO1xuXHRcdHZhciByZWYgPSBuZXcgRmlyZWJhc2UodXJpKTtcblxuXHRcdC8qKlxuXHRcdCAqIEZpcmViYXNlIGF1dGhlbnRpY2F0aW9uIGNvbnRyb2xzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Kn0gQXV0aGVudGljYXRpb25cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBhdXRoKCkge1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZUF1dGgocmVmKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCBGaXJlYmFzZSBkYXRhXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBGaXJlYmFzZSBkYXRhIG9iamVjdFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRhdGEoKSB7XG5cdFx0XHR2YXIgX3JlZiA9IG5ldyBGaXJlYmFzZSh1cmkgKyAnZGF0YScpO1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZU9iamVjdChfcmVmKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCBGaXJlYmFzZSBFdmVudHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtvYmplY3R9IEZpcmViYXNlIGFycmF5XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZXZlbnRzKCkge1xuXHRcdFx0dmFyIF9yZWYgPSBuZXcgRmlyZWJhc2UodXJpICsgJ2V2ZW50cycpO1xuXHRcdFx0cmV0dXJuICRmaXJlYmFzZUFycmF5KF9yZWYpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZldGNoIEZpcmViYXNlIFJTVlBzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBGaXJlYmFzZSBhcnJheVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHJzdnBzKCkge1xuXHRcdFx0dmFyIF9yZWYgPSBuZXcgRmlyZWJhc2UodXJpICsgJ3JzdnBzJyk7XG5cdFx0XHRyZXR1cm4gJGZpcmViYXNlQXJyYXkoX3JlZik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHVyaTogdXJpLFxuXHRcdFx0cmVmOiByZWYsXG5cdFx0XHRhdXRoOiBhdXRoLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdGV2ZW50czogZXZlbnRzLFxuXHRcdFx0cnN2cHM6IHJzdnBzXG5cdFx0fVxuXHR9XG59KSgpOyIsIi8vIG1lZGlhIHF1ZXJ5IGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ01RJywge1xuXHRcdFx0U01BTEw6ICcobWF4LXdpZHRoOiA3NjdweCknLFxuXHRcdFx0TEFSR0U6ICcobWluLXdpZHRoOiA3NjhweCknXG5cdFx0fSk7XG59KSgpOyIsIi8vIGxvZ2luL09hdXRoIGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ09BVVRIJywge1xuXHRcdFx0TE9HSU5TOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ29vZ2xlJyxcblx0XHRcdFx0XHRuYW1lOiAnR29vZ2xlJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSdcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGFjY291bnQ6ICd0d2l0dGVyJyxcblx0XHRcdFx0XHRuYW1lOiAnVHdpdHRlcicsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL3R3aXR0ZXIuY29tJ1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0YWNjb3VudDogJ2ZhY2Vib29rJyxcblx0XHRcdFx0XHRuYW1lOiAnRmFjZWJvb2snLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly9mYWNlYm9vay5jb20nXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ2l0aHViJyxcblx0XHRcdFx0XHRuYW1lOiAnR2l0SHViJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vZ2l0aHViLmNvbSdcblx0XHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0pO1xufSkoKTsiLCIvLyBVdGlsaXR5IGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnVXRpbHMnLCBVdGlscyk7XG5cblx0ZnVuY3Rpb24gVXRpbHMoKSB7XG5cdFx0ZnVuY3Rpb24gZ2V0VXNlclBpY3R1cmUodXNlcikge1xuXHRcdFx0dmFyIF9wcm92aWRlciA9IHVzZXIucHJvdmlkZXIsXG5cdFx0XHRcdF9wcm9maWxlID0gdXNlcltfcHJvdmlkZXJdLmNhY2hlZFVzZXJQcm9maWxlO1xuXG5cdFx0XHQvLyBUT0RPOiB0dXJuIHRoaXMgaW50byBhIGhhc2htYXBcblx0XHRcdGlmIChfcHJvdmlkZXIgPT09ICdnaXRodWInKSB7XG5cdFx0XHRcdHJldHVybiBfcHJvZmlsZS5hdmF0YXJfdXJsO1xuXHRcdFx0fSBlbHNlIGlmIChfcHJvdmlkZXIgPT09ICdnb29nbGUnKSB7XG5cdFx0XHRcdHJldHVybiBfcHJvZmlsZS5waWN0dXJlO1xuXHRcdFx0fSBlbHNlIGlmIChfcHJvdmlkZXIgPT09ICd0d2l0dGVyJykge1xuXHRcdFx0XHRyZXR1cm4gX3Byb2ZpbGUucHJvZmlsZV9pbWFnZV91cmw7XG5cdFx0XHR9IGVsc2UgaWYgKF9wcm92aWRlciA9PT0gJ2ZhY2Vib29rJykge1xuXHRcdFx0XHRyZXR1cm4gX3Byb2ZpbGUucGljdHVyZS5kYXRhLnVybDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBHZXQgb3JkaW5hbCB2YWx1ZVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIG4ge251bWJlcn0gaWYgYSBzdHJpbmcgaXMgcHJvdmlkZWQsICUgd2lsbCBhdHRlbXB0IHRvIGNvbnZlcnQgdG8gbnVtYmVyXG5cdFx0ICogQHJldHVybnMge3N0cmluZ30gdGgsIHN0LCBuZCwgcmRcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRPcmRpbmFsKG4pIHtcblx0XHRcdHZhciBvcmRBcnIgPSBbJ3RoJywgJ3N0JywgJ25kJywgJ3JkJ10sXG5cdFx0XHRcdG1vZHVsdXMgPSBuICUgMTAwO1xuXG5cdFx0XHRyZXR1cm4gb3JkQXJyWyhtb2R1bHVzIC0gMjApICUgMTBdIHx8IG9yZEFyclttb2R1bHVzXSB8fCBvcmRBcnJbMF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldFVzZXJQaWN0dXJlOiBnZXRVc2VyUGljdHVyZSxcblx0XHRcdGdldE9yZGluYWw6IGdldE9yZGluYWxcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LnJ1bihhdXRoUnVuKTtcblxuXHRhdXRoUnVuLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJGNvb2tpZXMnLCAnJGxvY2F0aW9uJywgJ0ZpcmUnXTtcblxuXHRmdW5jdGlvbiBhdXRoUnVuKCRyb290U2NvcGUsICRjb29raWVzLCAkbG9jYXRpb24sIEZpcmUpIHtcblx0XHQkcm9vdFNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCkge1xuXHRcdFx0dmFyIF9pc0F1dGhlbnRpY2F0ZWQgPSAhIUZpcmUucmVmLmdldEF1dGgoKTtcblxuXHRcdFx0aWYgKG5leHQgJiYgbmV4dC4kJHJvdXRlKSB7XG5cblx0XHRcdFx0Y29uc29sZS5sb2coJ25leHQgcm91dGU6JywgbmV4dC4kJHJvdXRlLm9yaWdpbmFsUGF0aCwgJ2lzIG5leHQgcm91dGUgc2VjdXJlOicsICEhbmV4dC4kJHJvdXRlLnNlY3VyZSwgJ2F1dGhlbnRpY2F0ZWQ6JywgX2lzQXV0aGVudGljYXRlZCk7XG5cblx0XHRcdFx0Ly8gaWYgbm90IGF1dGhlbnRpY2F0ZWQsIHJlZGlyZWN0IHRvIGxvZ2luIHBhZ2Vcblx0XHRcdFx0Ly8gaWYgcG9zc2libGUsIGFmdGVyIGxvZ2luLCByZWRpcmVjdCB0byBpbnRlbmRlZCByb3V0ZSAobGFyZ2UgbXEpXG5cdFx0XHRcdGlmIChuZXh0LiQkcm91dGUuc2VjdXJlICYmICFfaXNBdXRoZW50aWNhdGVkKSB7XG5cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2F2ZSBhdXRoIHBhdGg6JywgbmV4dC4kJHJvdXRlLm9yaWdpbmFsUGF0aCk7XG5cblx0XHRcdFx0XHQkY29va2llcy5hdXRoUGF0aCA9IG5leHQuJCRyb3V0ZS5vcmlnaW5hbFBhdGg7XG5cblx0XHRcdFx0XHQkcm9vdFNjb3BlLiRldmFsQXN5bmMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQvLyBzZW5kIHVzZXIgdG8gbG9naW5cblx0XHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcblx0XHRcdFx0XHRcdCRsb2NhdGlvbi5oYXNoKG51bGwpO1xuXHRcdFx0XHRcdFx0JGxvY2F0aW9uLnNlYXJjaCgndmlldycsIG51bGwpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gaWYgYXR0ZW1wdGluZyB0byBhY2Nlc3MgL2xvZ2luIHJvdXRlIGFuZCBhbHJlYWR5IGxvZ2dlZCBpbiwgcmVkaXJlY3QgdG8gaG9tZXBhZ2Vcblx0XHRcdFx0aWYgKG5leHQuJCRyb3V0ZS5vcmlnaW5hbFBhdGggPT09ICcvbG9naW4nICYmIF9pc0F1dGhlbnRpY2F0ZWQpIHtcblx0XHRcdFx0XHQkcm9vdFNjb3BlLiRldmFsQXN5bmMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnLycpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gaWYgcmVkaXJlY3RpbmcgZnJvbSBPYXV0aCwgY2hlY2sgdG8gc2VlIGlmIGFuIGludGVuZGVkIHJvdXRlIHdhcyBzYXZlZFxuXHRcdFx0XHQvLyBpZiBpbnRlbmRlZCBzZWN1cmUgcm91dGUsIGxvZ2luIGFuZCB0aGVuIHJlZGlyZWN0XG5cdFx0XHRcdC8vIGlmIG5vIGludGVuZGVkIHJvdXRlLCBnbyB0byBob21lcGFnZVxuXHRcdFx0XHRpZiAoY3VycmVudCAmJiBjdXJyZW50LiQkcm91dGUgJiYgY3VycmVudC4kJHJvdXRlLm9yaWdpbmFsUGF0aCA9PT0gJy9sb2dpbicgJiYgX2lzQXV0aGVudGljYXRlZCkge1xuXHRcdFx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmICgkY29va2llcy5hdXRoUGF0aCkge1xuXHRcdFx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgkY29va2llcy5hdXRoUGF0aCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnLycpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gbG9nZ2VkIGluIGFuZCBnb2luZyB0byBhbmQgZnJvbSBhIHNlY3VyZSByb3V0ZTogY2xlYXIgY29va2llXG5cdFx0XHRcdGlmIChuZXh0ICYmIG5leHQuJCRyb3V0ZSAmJiBuZXh0LiQkcm91dGUuc2VjdXJlICYmIGN1cnJlbnQgJiYgY3VycmVudC4kJHJvdXRlICYmIGN1cnJlbnQuJCRyb3V0ZS5zZWN1cmUgJiYgX2lzQXV0aGVudGljYXRlZCkge1xuXHRcdFx0XHRcdCRjb29raWVzLmF1dGhQYXRoID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9KTtcblx0fVxuXG59KSgpOyIsIi8vIHJvdXRlc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uZmlnKGFwcENvbmZpZyk7XG5cblx0YXBwQ29uZmlnLiRpbmplY3QgPSBbJyRyb3V0ZVByb3ZpZGVyJywgJyRsb2NhdGlvblByb3ZpZGVyJ107XG5cblx0ZnVuY3Rpb24gYXBwQ29uZmlnKCRyb3V0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuXHRcdCRyb3V0ZVByb3ZpZGVyXG5cdFx0XHQud2hlbignLycsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvZXZlbnRzL0V2ZW50cy52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWVcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2xvZ2luJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9sb2dpbi9Mb2dpbi52aWV3Lmh0bWwnXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9ldmVudC86ZXZlbnRJZCcsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvZXZlbnQtZGV0YWlsL0V2ZW50RGV0YWlsLnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvZXZlbnQvOmV2ZW50SWQvZWRpdCcsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvYWRtaW4vRWRpdEV2ZW50LnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvYWNjb3VudCcsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvYWNjb3VudC9BY2NvdW50LnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZSxcblx0XHRcdFx0cmVsb2FkT25TZWFyY2g6IGZhbHNlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9hZG1pbicsIHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICduZy1hcHAvYWRtaW4vQWRtaW4udmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlLFxuXHRcdFx0XHRyZWxvYWRPblNlYXJjaDogZmFsc2Vcblx0XHRcdH0pXG5cdFx0XHQub3RoZXJ3aXNlKHtcblx0XHRcdFx0cmVkaXJlY3RUbzogJy8nXG5cdFx0XHR9KTtcblxuXHRcdCRsb2NhdGlvblByb3ZpZGVyXG5cdFx0XHQuaHRtbDVNb2RlKHtcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC5oYXNoUHJlZml4KCchJyk7XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnZGV0ZWN0QWRibG9jaycsIGRldGVjdEFkYmxvY2spO1xuXG5cdGRldGVjdEFkYmxvY2suJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJ107XG5cblx0ZnVuY3Rpb24gZGV0ZWN0QWRibG9jaygkdGltZW91dCwgJGxvY2F0aW9uKSB7XG5cblx0XHRkZXRlY3RBZGJsb2NrTGluay4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGVsZW0nLCAnJGF0dHJzJ107XG5cblx0XHRmdW5jdGlvbiBkZXRlY3RBZGJsb2NrTGluaygkc2NvcGUsICRlbGVtLCAkYXR0cnMpIHtcblx0XHRcdC8vIGRhdGEgb2JqZWN0XG5cdFx0XHQkc2NvcGUuYWIgPSB7fTtcblxuXHRcdFx0Ly8gaG9zdG5hbWUgZm9yIG1lc3NhZ2luZ1xuXHRcdFx0JHNjb3BlLmFiLmhvc3QgPSAkbG9jYXRpb24uaG9zdCgpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIGlmIGFkcyBhcmUgYmxvY2tlZCAtIGNhbGxlZCBpbiAkdGltZW91dCB0byBsZXQgQWRCbG9ja2VycyBydW5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXJlQWRzQmxvY2tlZCgpIHtcblx0XHRcdFx0dmFyIF9hID0gJGVsZW0uZmluZCgnLmFkLXRlc3QnKTtcblxuXHRcdFx0XHQkc2NvcGUuYWIuYmxvY2tlZCA9IF9hLmhlaWdodCgpIDw9IDAgfHwgISRlbGVtLmZpbmQoJy5hZC10ZXN0OnZpc2libGUnKS5sZW5ndGg7XG5cdFx0XHR9XG5cblx0XHRcdCR0aW1lb3V0KF9hcmVBZHNCbG9ja2VkLCAyMDApO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdGxpbms6IGRldGVjdEFkYmxvY2tMaW5rLFxuXHRcdFx0dGVtcGxhdGU6ICAgJzxkaXYgY2xhc3M9XCJhZC10ZXN0IGZhLWZhY2Vib29rIGZhLXR3aXR0ZXJcIiBzdHlsZT1cImhlaWdodDoxcHg7XCI+PC9kaXY+JyArXG5cdFx0XHRcdFx0XHQnPGRpdiBuZy1pZj1cImFiLmJsb2NrZWRcIiBjbGFzcz1cImFiLW1lc3NhZ2UgYWxlcnQgYWxlcnQtZGFuZ2VyXCI+JyArXG5cdFx0XHRcdFx0XHRcdCc8aSBjbGFzcz1cImZhIGZhLWJhblwiPjwvaT4gPHN0cm9uZz5BZEJsb2NrPC9zdHJvbmc+IGlzIHByb2hpYml0aW5nIGltcG9ydGFudCBmdW5jdGlvbmFsaXR5ISBQbGVhc2UgZGlzYWJsZSBhZCBibG9ja2luZyBvbiA8c3Ryb25nPnt7YWIuaG9zdH19PC9zdHJvbmc+LiBUaGlzIHNpdGUgaXMgYWQtZnJlZS4nICtcblx0XHRcdFx0XHRcdCc8L2Rpdj4nXG5cdFx0fVxuXHR9XG5cbn0pKCk7IiwiLy8gRmV0Y2ggbG9jYWwgSlNPTiBkYXRhXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5zZXJ2aWNlKCdsb2NhbERhdGEnLCBsb2NhbERhdGEpO1xuXG5cdC8qKlxuXHQgKiBHRVQgcHJvbWlzZSByZXNwb25zZSBmdW5jdGlvblxuXHQgKiBDaGVja3MgdHlwZW9mIGRhdGEgcmV0dXJuZWQgYW5kIHN1Y2NlZWRzIGlmIEpTIG9iamVjdCwgdGhyb3dzIGVycm9yIGlmIG5vdFxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ugeyp9IGRhdGEgZnJvbSAkaHR0cFxuXHQgKiBAcmV0dXJucyB7Kn0gb2JqZWN0LCBhcnJheVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gX2dldFJlcyhyZXNwb25zZSkge1xuXHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3JldHJpZXZlZCBkYXRhIGlzIG5vdCB0eXBlb2Ygb2JqZWN0LicpO1xuXHRcdH1cblx0fVxuXG5cdGxvY2FsRGF0YS4kaW5qZWN0ID0gWyckaHR0cCddO1xuXG5cdGZ1bmN0aW9uIGxvY2FsRGF0YSgkaHR0cCkge1xuXHRcdC8qKlxuXHRcdCAqIEdldCBsb2NhbCBKU09OIGRhdGEgZmlsZSBhbmQgcmV0dXJuIHJlc3VsdHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0SlNPTiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9uZy1hcHAvZGF0YS9kYXRhLmpzb24nKVxuXHRcdFx0XHQudGhlbihfZ2V0UmVzKTtcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIGFuZ3VsYXJNZWRpYUNoZWNrID0gYW5ndWxhci5tb2R1bGUoJ21lZGlhQ2hlY2snLCBbXSk7XG5cblx0YW5ndWxhck1lZGlhQ2hlY2suc2VydmljZSgnbWVkaWFDaGVjaycsIFsnJHdpbmRvdycsICckdGltZW91dCcsIGZ1bmN0aW9uICgkd2luZG93LCAkdGltZW91dCkge1xuXHRcdHRoaXMuaW5pdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0XHR2YXIgJHNjb3BlID0gb3B0aW9uc1snc2NvcGUnXSxcblx0XHRcdFx0cXVlcnkgPSBvcHRpb25zWydtcSddLFxuXHRcdFx0XHRkZWJvdW5jZSA9IG9wdGlvbnNbJ2RlYm91bmNlJ10sXG5cdFx0XHRcdCR3aW4gPSBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdyksXG5cdFx0XHRcdGJyZWFrcG9pbnRzLFxuXHRcdFx0XHRjcmVhdGVMaXN0ZW5lciA9IHZvaWQgMCxcblx0XHRcdFx0aGFzTWF0Y2hNZWRpYSA9ICR3aW5kb3cubWF0Y2hNZWRpYSAhPT0gdW5kZWZpbmVkICYmICEhJHdpbmRvdy5tYXRjaE1lZGlhKCchJykuYWRkTGlzdGVuZXIsXG5cdFx0XHRcdG1xTGlzdExpc3RlbmVyLFxuXHRcdFx0XHRtbUxpc3RlbmVyLFxuXHRcdFx0XHRkZWJvdW5jZVJlc2l6ZSxcblx0XHRcdFx0bXEgPSB2b2lkIDAsXG5cdFx0XHRcdG1xQ2hhbmdlID0gdm9pZCAwLFxuXHRcdFx0XHRkZWJvdW5jZVNwZWVkID0gISFkZWJvdW5jZSA/IGRlYm91bmNlIDogMjUwO1xuXG5cdFx0XHRpZiAoaGFzTWF0Y2hNZWRpYSkge1xuXHRcdFx0XHRtcUNoYW5nZSA9IGZ1bmN0aW9uIChtcSkge1xuXHRcdFx0XHRcdGlmIChtcS5tYXRjaGVzICYmIHR5cGVvZiBvcHRpb25zLmVudGVyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRvcHRpb25zLmVudGVyKG1xKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmV4aXQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5leGl0KG1xKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5jaGFuZ2UobXEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjcmVhdGVMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRtcSA9ICR3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSk7XG5cdFx0XHRcdFx0bXFMaXN0TGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbXFDaGFuZ2UobXEpXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdG1xLmFkZExpc3RlbmVyKG1xTGlzdExpc3RlbmVyKTtcblxuXHRcdFx0XHRcdC8vIGJpbmQgdG8gdGhlIG9yaWVudGF0aW9uY2hhbmdlIGV2ZW50IGFuZCBmaXJlIG1xQ2hhbmdlXG5cdFx0XHRcdFx0JHdpbi5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIG1xTGlzdExpc3RlbmVyKTtcblxuXHRcdFx0XHRcdC8vIGNsZWFudXAgbGlzdGVuZXJzIHdoZW4gJHNjb3BlIGlzICRkZXN0cm95ZWRcblx0XHRcdFx0XHQkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdG1xLnJlbW92ZUxpc3RlbmVyKG1xTGlzdExpc3RlbmVyKTtcblx0XHRcdFx0XHRcdCR3aW4udW5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIG1xTGlzdExpc3RlbmVyKTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJldHVybiBtcUNoYW5nZShtcSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0cmV0dXJuIGNyZWF0ZUxpc3RlbmVyKCk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJyZWFrcG9pbnRzID0ge307XG5cblx0XHRcdFx0bXFDaGFuZ2UgPSBmdW5jdGlvbiAobXEpIHtcblx0XHRcdFx0XHRpZiAobXEubWF0Y2hlcykge1xuXHRcdFx0XHRcdFx0aWYgKCEhYnJlYWtwb2ludHNbcXVlcnldID09PSBmYWxzZSAmJiAodHlwZW9mIG9wdGlvbnMuZW50ZXIgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuZW50ZXIobXEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAoYnJlYWtwb2ludHNbcXVlcnldID09PSB0cnVlIHx8IGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5leGl0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5leGl0KG1xKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICgobXEubWF0Y2hlcyAmJiAoIWJyZWFrcG9pbnRzW3F1ZXJ5XSkgfHwgKCFtcS5tYXRjaGVzICYmIChicmVha3BvaW50c1txdWVyeV0gPT09IHRydWUgfHwgYnJlYWtwb2ludHNbcXVlcnldID09IG51bGwpKSkpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5jaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5jaGFuZ2UobXEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBicmVha3BvaW50c1txdWVyeV0gPSBtcS5tYXRjaGVzO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBjb252ZXJ0RW1Ub1B4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdFx0dmFyIGVtRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG5cdFx0XHRcdFx0ZW1FbGVtZW50LnN0eWxlLndpZHRoID0gJzFlbSc7XG5cdFx0XHRcdFx0ZW1FbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcblx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVtRWxlbWVudCk7XG5cdFx0XHRcdFx0cHggPSB2YWx1ZSAqIGVtRWxlbWVudC5vZmZzZXRXaWR0aDtcblx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGVtRWxlbWVudCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gcHg7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGdldFBYVmFsdWUgPSBmdW5jdGlvbiAod2lkdGgsIHVuaXQpIHtcblx0XHRcdFx0XHR2YXIgdmFsdWU7XG5cdFx0XHRcdFx0dmFsdWUgPSB2b2lkIDA7XG5cdFx0XHRcdFx0c3dpdGNoICh1bml0KSB7XG5cdFx0XHRcdFx0XHRjYXNlICdlbSc6XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gY29udmVydEVtVG9QeCh3aWR0aCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0dmFsdWUgPSB3aWR0aDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGJyZWFrcG9pbnRzW3F1ZXJ5XSA9IG51bGw7XG5cblx0XHRcdFx0bW1MaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgcGFydHMgPSBxdWVyeS5tYXRjaCgvXFwoKC4qKS0uKjpcXHMqKFtcXGRcXC5dKikoLiopXFwpLyksXG5cdFx0XHRcdFx0XHRjb25zdHJhaW50ID0gcGFydHNbMV0sXG5cdFx0XHRcdFx0XHR2YWx1ZSA9IGdldFBYVmFsdWUocGFyc2VJbnQocGFydHNbMl0sIDEwKSwgcGFydHNbM10pLFxuXHRcdFx0XHRcdFx0ZmFrZU1hdGNoTWVkaWEgPSB7fSxcblx0XHRcdFx0XHRcdHdpbmRvd1dpZHRoID0gJHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aDtcblxuXHRcdFx0XHRcdGZha2VNYXRjaE1lZGlhLm1hdGNoZXMgPSBjb25zdHJhaW50ID09PSAnbWF4JyAmJiB2YWx1ZSA+IHdpbmRvd1dpZHRoIHx8IGNvbnN0cmFpbnQgPT09ICdtaW4nICYmIHZhbHVlIDwgd2luZG93V2lkdGg7XG5cblx0XHRcdFx0XHRyZXR1cm4gbXFDaGFuZ2UoZmFrZU1hdGNoTWVkaWEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBmYWtlTWF0Y2hNZWRpYVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQoZGVib3VuY2VSZXNpemUpO1xuXHRcdFx0XHRcdGRlYm91bmNlUmVzaXplID0gJHRpbWVvdXQobW1MaXN0ZW5lciwgZGVib3VuY2VTcGVlZCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHdpbi5iaW5kKCdyZXNpemUnLCBmYWtlTWF0Y2hNZWRpYVJlc2l6ZSk7XG5cblx0XHRcdFx0JHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHdpbi51bmJpbmQoJ3Jlc2l6ZScsIGZha2VNYXRjaE1lZGlhUmVzaXplKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuIG1tTGlzdGVuZXIoKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XSk7XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZpbHRlcigndHJ1c3RBc0hUTUwnLCB0cnVzdEFzSFRNTCk7XG5cblx0dHJ1c3RBc0hUTUwuJGluamVjdCA9IFsnJHNjZSddO1xuXG5cdGZ1bmN0aW9uIHRydXN0QXNIVE1MKCRzY2UpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24gKHRleHQpIHtcblx0XHRcdHJldHVybiAkc2NlLnRydXN0QXNIdG1sKHRleHQpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiLy8gRm9yIGV2ZW50cyBiYXNlZCBvbiB2aWV3cG9ydCBzaXplIC0gdXBkYXRlcyBhcyB2aWV3cG9ydCBpcyByZXNpemVkXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZpZXdTd2l0Y2gnLCB2aWV3U3dpdGNoKTtcblxuXHR2aWV3U3dpdGNoLiRpbmplY3QgPSBbJ21lZGlhQ2hlY2snLCAnTVEnLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiB2aWV3U3dpdGNoKG1lZGlhQ2hlY2ssIE1RLCAkdGltZW91dCkge1xuXG5cdFx0dmlld1N3aXRjaExpbmsuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHQvKipcblx0XHQgKiB2aWV3U3dpdGNoIGRpcmVjdGl2ZSBsaW5rIGZ1bmN0aW9uXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gJHNjb3BlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdmlld1N3aXRjaExpbmsoJHNjb3BlKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLnZzID0ge307XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBlbnRlciBtZWRpYSBxdWVyeVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9lbnRlckZuKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnZzLnZpZXdmb3JtYXQgPSAnc21hbGwnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGV4aXQgbWVkaWEgcXVlcnlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXhpdEZuKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnZzLnZpZXdmb3JtYXQgPSAnbGFyZ2UnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBtZWRpYUNoZWNrXG5cdFx0XHRtZWRpYUNoZWNrLmluaXQoe1xuXHRcdFx0XHRzY29wZTogJHNjb3BlLFxuXHRcdFx0XHRtcTogTVEuU01BTEwsXG5cdFx0XHRcdGVudGVyOiBfZW50ZXJGbixcblx0XHRcdFx0ZXhpdDogX2V4aXRGblxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogdmlld1N3aXRjaExpbmtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0V2ZW50RGV0YWlsQ3RybCcsIEV2ZW50RGV0YWlsQ3RybCk7XG5cblx0RXZlbnREZXRhaWxDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICdGaXJlJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gRXZlbnREZXRhaWxDdHJsKCRzY29wZSwgJHJvb3RTY29wZSwgJHJvdXRlUGFyYW1zLCBGaXJlLCBFdmVudCkge1xuXHRcdHZhciBldmVudCA9IHRoaXM7XG5cdFx0dmFyIF9ldmVudElkID0gJHJvdXRlUGFyYW1zLmV2ZW50SWQ7XG5cblx0XHRldmVudC5kYXRhID0gRmlyZS5kYXRhKCk7XG5cblx0XHQvLyBzeW5jaHJvbm91c2x5IHJldHJpZXZlIHVzZXIgZGF0YVxuXHRcdGV2ZW50LnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHRldmVudC5zaG93TW9kYWwgPSBmYWxzZTtcblxuXHRcdGV2ZW50Lm9wZW5Sc3ZwTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdGV2ZW50LnNob3dNb2RhbCA9IHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCB1c2VyJ3MgUlNWUCBmb3IgdGhpcyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZ2V0VXNlclJzdnAoKSB7XG5cdFx0XHR2YXIgcnN2cHMgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUlNWUHMgaGF2ZSBiZWVuIGZldGNoZWQgc3VjY2Vzc2Z1bGx5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBzTG9hZGVkU3VjY2VzcygpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByc3Zwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHZhciB0aGlzUnN2cCA9IHJzdnBzW2ldO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXNSc3ZwLmV2ZW50SWQgPT09IF9ldmVudElkICYmIHRoaXNSc3ZwLnVzZXJJZCA9PT0gZXZlbnQudXNlci51aWQpIHtcblx0XHRcdFx0XHRcdGV2ZW50LnJzdnBPYmogPSB0aGlzUnN2cDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGV2ZW50Lm5vUnN2cCA9ICFldmVudC5yc3ZwT2JqO1xuXG5cdFx0XHRcdHZhciBndWVzdHMgPSAhZXZlbnQubm9Sc3ZwID8gZXZlbnQucnN2cE9iai5ndWVzdHMgOiBudWxsO1xuXG5cdFx0XHRcdGlmICghZXZlbnQubm9Sc3ZwICYmICEhZ3Vlc3RzID09PSBmYWxzZSB8fCBndWVzdHMgPT0gMSkge1xuXHRcdFx0XHRcdGV2ZW50Lmd1ZXN0VGV4dCA9IGV2ZW50LnJzdnBPYmoubmFtZSArICcgaXMnO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGd1ZXN0cyAmJiBndWVzdHMgPiAxKSB7XG5cdFx0XHRcdFx0ZXZlbnQuZ3Vlc3RUZXh0ID0gZXZlbnQucnN2cE9iai5uYW1lICsgJyArICcgKyAoZ3Vlc3RzIC0gMSkgKyAnIGFyZSAnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXZlbnQuYXR0ZW5kaW5nVGV4dCA9ICFldmVudC5ub1JzdnAgJiYgZXZlbnQucnN2cE9iai5hdHRlbmRpbmcgPyAnYXR0ZW5kaW5nJyA6ICdub3QgYXR0ZW5kaW5nJztcblx0XHRcdFx0ZXZlbnQucnN2cEJ0blRleHQgPSBldmVudC5ub1JzdnAgPyAnUlNWUCcgOiAnVXBkYXRlIG15IFJTVlAnO1xuXHRcdFx0XHRldmVudC5zaG93RXZlbnREb3dubG9hZCA9IGV2ZW50LnJzdnBPYmogJiYgZXZlbnQucnN2cE9iai5hdHRlbmRpbmc7XG5cdFx0XHRcdGV2ZW50LmNyZWF0ZU9yVXBkYXRlID0gZXZlbnQubm9Sc3ZwID8gJ2NyZWF0ZScgOiAndXBkYXRlJztcblx0XHRcdFx0ZXZlbnQucnN2cFJlYWR5ID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0cnN2cHMuJGxvYWRlZCgpLnRoZW4oX3JzdnBzTG9hZGVkU3VjY2Vzcyk7XG5cdFx0fVxuXG5cdFx0X2dldFVzZXJSc3ZwKCk7XG5cblx0XHQvLyB3aGVuIFJTVlAgaGFzIGJlZW4gc3VibWl0dGVkLCB1cGRhdGUgdXNlciBkYXRhXG5cdFx0JHJvb3RTY29wZS4kb24oJ3JzdnBTdWJtaXR0ZWQnLCBfZ2V0VXNlclJzdnApO1xuXG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgLmljcyBmaWxlIGZvciB0aGlzIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZW5lcmF0ZUljYWwoKSB7XG5cdFx0XHRldmVudC5jYWwgPSBpY3MoKTtcblxuXHRcdFx0dmFyIF9zdGFydEQgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGV2ZW50LmRldGFpbC5zdGFydERhdGUsIGV2ZW50LmRldGFpbC5zdGFydFRpbWUpLFxuXHRcdFx0XHRfZW5kRCA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZlbnQuZGV0YWlsLmVuZERhdGUsIGV2ZW50LmRldGFpbC5lbmRUaW1lKTtcblxuXHRcdFx0ZXZlbnQuY2FsLmFkZEV2ZW50KGV2ZW50LmRldGFpbC50aXRsZSwgZXZlbnQuZGV0YWlsLmRlc2NyaXB0aW9uLCBldmVudC5kZXRhaWwubG9jYXRpb24sIF9zdGFydEQsIF9lbmREKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEb3dubG9hZCAuaWNzIGZpbGVcblx0XHQgKi9cblx0XHRldmVudC5kb3dubG9hZEljcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZXZlbnQuY2FsLmRvd25sb2FkKCk7XG5cdFx0fTtcblxuXHRcdHZhciBldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBzaW5nbGUgZXZlbnQgZGV0YWlsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7b2JqZWN0fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudFN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0ZXZlbnQuZGV0YWlsID0gZXZlbnRzLiRnZXRSZWNvcmQoX2V2ZW50SWQpO1xuXG5cdFx0XHRpZiAoZXZlbnQuZGV0YWlsKSB7XG5cdFx0XHRcdGV2ZW50LmRldGFpbC5wcmV0dHlEYXRlID0gRXZlbnQuZ2V0UHJldHR5RGF0ZXRpbWUoZXZlbnQuZGV0YWlsKTtcblx0XHRcdFx0ZXZlbnQuZGV0YWlsLmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKGV2ZW50LmRldGFpbCk7XG5cdFx0XHR9XG5cblx0XHRcdGV2ZW50LmV2ZW50UmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50cy4kbG9hZGVkKF9ldmVudFN1Y2Nlc3MpO1xuXG5cdFx0dmFyIF93YXRjaFJzdnBSZWFkeSA9ICRzY29wZS4kd2F0Y2goJ2V2ZW50LnJzdnBSZWFkeScsIGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRpZiAobmV3VmFsICYmIGV2ZW50LmRldGFpbCAmJiBldmVudC5kZXRhaWwucnN2cCkge1xuXHRcdFx0XHRfZ2VuZXJhdGVJY2FsKCk7XG5cdFx0XHRcdF93YXRjaFJzdnBSZWFkeSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgncnN2cEZvcm0nLCByc3ZwRm9ybSk7XG5cblx0cnN2cEZvcm0uJGluamVjdCA9IFsnRmlyZScsICckdGltZW91dCcsICckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gcnN2cEZvcm0oRmlyZSwgJHRpbWVvdXQsICRyb290U2NvcGUpIHtcblxuXHRcdHJzdnBGb3JtQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIHJzdnBGb3JtQ3RybCgkc2NvcGUpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBzeW50YXhcblx0XHRcdHZhciByZiA9IHRoaXM7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGZvcm0gaXMgY3JlYXRlIG9yIGVkaXQgKGRvZXMgdGhlIG1vZGVsIGFscmVhZHkgZXhpc3Qgb3Igbm90KVxuXHRcdFx0dmFyIF9pc0NyZWF0ZSA9ICEhcmYuZm9ybU1vZGVsSWQgPT09IGZhbHNlO1xuXHRcdFx0dmFyIF9pc0VkaXQgPSAhIXJmLmZvcm1Nb2RlbElkID09PSB0cnVlO1xuXG5cdFx0XHQvLyBnZXQgUlNWUHNcblx0XHRcdHZhciByc3ZwcztcblxuXHRcdFx0cmYubnVtYmVyUmVnZXggPSAvXihbMS05XXwxMCkkLztcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHZXQgdGhlIFJTVlAgdGhhdCBzaG91bGQgYmUgZWRpdGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldEVkaXRSc3ZwKCkge1xuXHRcdFx0XHRyc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0XHRyc3Zwcy4kbG9hZGVkKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZi5mb3JtTW9kZWwgPSByc3Zwcy4kZ2V0UmVjb3JkKHJmLmZvcm1Nb2RlbElkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0cnN2cHMgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRcdFx0cmYuZm9ybU1vZGVsID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogcmYudXNlcklkLFxuXHRcdFx0XHRcdGV2ZW50TmFtZTogcmYuZXZlbnQudGl0bGUsXG5cdFx0XHRcdFx0ZXZlbnRJZDogcmYuZXZlbnQuJGlkLFxuXHRcdFx0XHRcdG5hbWU6IHJmLnVzZXJOYW1lXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0X2dldEVkaXRSc3ZwKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogV3JhcCAkd2F0Y2ggaW4gYSBmdW5jdGlvbiBzbyB0aGF0IGl0IGNhbiBiZSByZS1pbml0aWFsaXplZCBhZnRlciBpdCdzIGJlZW4gZGVyZWdpc3RlcmVkXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9zdGFydFdhdGNoQXR0ZW5kaW5nKCkge1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogV2F0Y2ggdXNlcidzIGF0dGVuZGluZyBpbnB1dCBhbmQgaWYgdHJ1ZSwgc2V0IGRlZmF1bHQgbnVtYmVyIG9mIGd1ZXN0cyB0byAxXG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIEB0eXBlIHsqfGZ1bmN0aW9uKCl9XG5cdFx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHR2YXIgX3dhdGNoQXR0ZW5kaW5nID0gJHNjb3BlLiR3YXRjaCgncmYuZm9ybU1vZGVsLmF0dGVuZGluZycsIGZ1bmN0aW9uIChuZXdWYWwsIG9sZFZhbCkge1xuXHRcdFx0XHRcdGlmIChuZXdWYWwgPT09IHRydWUgJiYgIW9sZFZhbCAmJiAhcmYuZm9ybU1vZGVsLmd1ZXN0cykge1xuXHRcdFx0XHRcdFx0cmYuZm9ybU1vZGVsLmd1ZXN0cyA9IDE7XG5cblx0XHRcdFx0XHRcdC8vIGRlcmVnaXN0ZXIgJHdhdGNoXG5cdFx0XHRcdFx0XHRfd2F0Y2hBdHRlbmRpbmcoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdGFydCB3YXRjaGluZyByZi5mb3JtTW9kZWwuYXR0ZW5kaW5nXG5cdFx0XHRfc3RhcnRXYXRjaEF0dGVuZGluZygpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJlc2V0IHRoZSBzdGF0ZSBvZiB0aGUgZm9ybSBTdWJtaXQgYnV0dG9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2J0blN1Ym1pdFJlc2V0KCkge1xuXHRcdFx0XHRyZi5idG5TYXZlZCA9IGZhbHNlO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1N1Ym1pdCBSU1ZQJyA6ICdVcGRhdGUgUlNWUCc7XG5cdFx0XHR9XG5cblx0XHRcdF9idG5TdWJtaXRSZXNldCgpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBSU1ZQIEFQSSBjYWxsIHN1Y2NlZWRlZFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwU3VjY2VzcygpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSB0cnVlO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1N1Ym1pdHRlZCEnIDogJ1VwZGF0ZWQhJztcblxuXHRcdFx0XHQkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3JzdnBTdWJtaXR0ZWQnKTtcblxuXHRcdFx0XHQvLyB1c2VyIGhhcyBzdWJtaXR0ZWQgYW4gUlNWUDsgdXBkYXRlIGNyZWF0ZS9lZGl0IHN0YXR1cyBpbiBjYXNlIHRoZXkgZWRpdCB3aXRob3V0IHJlZnJlc2hpbmdcblx0XHRcdFx0X2lzQ3JlYXRlID0gZmFsc2U7XG5cdFx0XHRcdF9pc0VkaXQgPSB0cnVlO1xuXG5cdFx0XHRcdC8vIHJlc3RhcnQgJHdhdGNoIG9uIHJmLmZvcm1Nb2RlbC5hdHRlbmRpbmdcblx0XHRcdFx0X3N0YXJ0V2F0Y2hBdHRlbmRpbmcoKTtcblxuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfYnRuU3VibWl0UmVzZXQoKTtcblx0XHRcdFx0XHRyZi5zaG93TW9kYWwgPSBmYWxzZTtcblx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdCRyb290U2NvcGUuJG9uKCdyc3ZwU3VibWl0dGVkJywgX2dldEVkaXRSc3ZwKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgUlNWUCBBUEkgY2FsbCBlcnJvclxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwRXJyb3IoZXJyKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gJ2Vycm9yJztcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdFcnJvciBzdWJtaXR0aW5nIScgOiAnRXJyb3IgdXBkYXRpbmchJztcblxuXHRcdFx0XHRjb25zb2xlLmxvZyhyZi5idG5TdWJtaXRUZXh0LCBlcnIpO1xuXG5cdFx0XHRcdCR0aW1lb3V0KF9idG5TdWJtaXRSZXNldCwgMzAwMCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgc3VibWl0IGJ1dHRvblxuXHRcdFx0ICogU3VibWl0IFJTVlAgdG8gQVBJXG5cdFx0XHQgKiBGb3JtIEAgcnN2cEZvcm0udHBsLmh0bWxcblx0XHRcdCAqL1xuXHRcdFx0cmYuc3VibWl0UnN2cCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gJ1NlbmRpbmcuLi4nO1xuXG5cdFx0XHRcdGlmICghcmYuZm9ybU1vZGVsLmF0dGVuZGluZykge1xuXHRcdFx0XHRcdHJmLmZvcm1Nb2RlbC5ndWVzdHMgPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRcdHJzdnBzLiRhZGQocmYuZm9ybU1vZGVsKS50aGVuKF9yc3ZwU3VjY2VzcywgX3JzdnBFcnJvcik7XG5cblx0XHRcdFx0fSBlbHNlIGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdFx0cnN2cHMuJHNhdmUocmYuZm9ybU1vZGVsKS50aGVuKF9yc3ZwU3VjY2VzcywgX3JzdnBFcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgZnVuY3Rpb24gdG8gY2xvc2UgdGhlIG1vZGFsIHdpbmRvd1xuXHRcdFx0ICovXG5cdFx0XHRyZi5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJmLnNob3dNb2RhbCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGV2ZW50OiAnPScsXG5cdFx0XHRcdHVzZXJOYW1lOiAnQCcsXG5cdFx0XHRcdHVzZXJJZDogJ0AnLFxuXHRcdFx0XHRmb3JtTW9kZWxJZDogJ0AnLFxuXHRcdFx0XHRzaG93TW9kYWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnL25nLWFwcC9ldmVudC1kZXRhaWwvcnN2cEZvcm0udHBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogcnN2cEZvcm1DdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAncmYnLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdFdmVudHNDdHJsJywgRXZlbnRzQ3RybCk7XG5cblx0RXZlbnRzQ3RybC4kaW5qZWN0ID0gWydGaXJlJywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gRXZlbnRzQ3RybChGaXJlLCBFdmVudCkge1xuXHRcdHZhciBldmVudHMgPSB0aGlzO1xuXG5cdFx0ZXZlbnRzLmFsbEV2ZW50cyA9IEZpcmUuZXZlbnRzKCk7XG5cblx0XHQvLyBzeW5jaHJvbm91c2x5IHJldHJpZXZlIHVzZXIgZGF0YVxuXHRcdGV2ZW50cy51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBldmVudHMgbGlzdFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge0FycmF5fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9ldmVudHNTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmFsbEV2ZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgdGhpc0V2dCA9IGV2ZW50cy5hbGxFdmVudHNbaV07XG5cblx0XHRcdFx0dGhpc0V2dC5zdGFydERhdGVKUyA9IEV2ZW50LmdldEpTRGF0ZXRpbWUodGhpc0V2dC5zdGFydERhdGUsIHRoaXNFdnQuc3RhcnRUaW1lKTtcblx0XHRcdFx0dGhpc0V2dC5leHBpcmVkID0gRXZlbnQuZXhwaXJlZCh0aGlzRXZ0KTtcblx0XHRcdH1cblxuXHRcdFx0ZXZlbnRzLmV2ZW50c1JlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRldmVudHMuYWxsRXZlbnRzLiRsb2FkZWQoKS50aGVuKF9ldmVudHNTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRldmVudHMuc29ydFN0YXJ0RGF0ZSA9IGZ1bmN0aW9uKGV2dCkge1xuXHRcdFx0cmV0dXJuIEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZ0LnN0YXJ0RGF0ZSwgZXZ0LnN0YXJ0VGltZSk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5maWx0ZXIoJ3ByZXR0eURhdGUnLCBwcmV0dHlEYXRlKTtcblxuXHRmdW5jdGlvbiBwcmV0dHlEYXRlKCkge1xuXHRcdC8qKlxuXHRcdCAqIFRha2VzIGEgZGF0ZSBzdHJpbmcgYW5kIGNvbnZlcnRzIGl0IHRvIGEgcHJldHR5IGRhdGVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRlU3RyIHtzdHJpbmd9XG5cdFx0ICovXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIChkYXRlU3RyKSB7XG5cdFx0XHR2YXIgZCA9IG5ldyBEYXRlKGRhdGVTdHIpLFxuXHRcdFx0XHRtb250aHNBcnIgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ10sXG5cdFx0XHRcdG1vbnRoID0gbW9udGhzQXJyW2QuZ2V0TW9udGgoKV0sXG5cdFx0XHRcdGRheSA9IGQuZ2V0RGF0ZSgpLFxuXHRcdFx0XHR5ZWFyID0gZC5nZXRGdWxsWWVhcigpLFxuXHRcdFx0XHRwcmV0dHlEYXRlO1xuXG5cdFx0XHRwcmV0dHlEYXRlID0gbW9udGggKyAnICcgKyBkYXkgKyAnLCAnICsgeWVhcjtcblxuXHRcdFx0cmV0dXJuIHByZXR0eURhdGU7XG5cdFx0fTtcblx0fVxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ215QXBwJylcclxuXHRcdC5jb250cm9sbGVyKCdIZWFkZXJDdHJsJywgaGVhZGVyQ3RybCk7XHJcblxyXG5cdGhlYWRlckN0cmwuJGluamVjdCA9IFsnJGxvY2F0aW9uJywgJ2xvY2FsRGF0YScsICdGaXJlJywgJyRyb290U2NvcGUnXTtcclxuXHJcblx0ZnVuY3Rpb24gaGVhZGVyQ3RybCgkbG9jYXRpb24sIGxvY2FsRGF0YSwgRmlyZSwgJHJvb3RTY29wZSkge1xyXG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxyXG5cdFx0dmFyIGhlYWRlciA9IHRoaXM7XHJcblxyXG5cdFx0Ly8gYXV0aGVudGljYXRpb24gY29udHJvbHNcclxuXHRcdHZhciBfYXV0aCA9IEZpcmUuYXV0aCgpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2V0IHRoZSBsb2NhbCBkYXRhIGZyb20gSlNPTlxyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSBkYXRhXHJcblx0XHQgKiBAcHJpdmF0ZVxyXG5cdFx0ICovXHJcblx0XHRmdW5jdGlvbiBfbG9jYWxEYXRhU3VjY2VzcyhkYXRhKSB7XHJcblx0XHRcdGhlYWRlci5sb2NhbERhdGEgPSBkYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxvY2FsRGF0YS5nZXRKU09OKCkudGhlbihfbG9jYWxEYXRhU3VjY2Vzcyk7XHJcblxyXG5cdFx0Ly8gZ2V0IGRhdGEgZnJvbSB0aGUgZGF0YWJhc2VcclxuXHRcdGhlYWRlci5kYXRhID0gRmlyZS5kYXRhKCk7XHJcblx0XHRoZWFkZXIudXNlciA9IEZpcmUucmVmLmdldEF1dGgoKTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFN1Y2Nlc3MgZnVuY3Rpb24gZnJvbSBhdXRoZW50aWNhdGluZ1xyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSBhdXRoRGF0YSB7b2JqZWN0fVxyXG5cdFx0ICovXHJcblx0XHRmdW5jdGlvbiBfb25BdXRoQ2IoYXV0aERhdGEpIHtcclxuXHRcdFx0aGVhZGVyLnVzZXIgPSBhdXRoRGF0YTtcclxuXHJcblx0XHRcdGlmICghYXV0aERhdGEpIHtcclxuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XHJcblx0XHRcdFx0JGxvY2F0aW9uLmhhc2gobnVsbCk7XHJcblx0XHRcdFx0JGxvY2F0aW9uLnNlYXJjaCgndmlldycsIG51bGwpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gb24gbG9naW4gb3IgbG9nb3V0XHJcblx0XHRfYXV0aC4kb25BdXRoKF9vbkF1dGhDYik7XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBMb2cgdGhlIHVzZXIgb3V0IG9mIHdoYXRldmVyIGF1dGhlbnRpY2F0aW9uIHRoZXkndmUgc2lnbmVkIGluIHdpdGhcclxuXHRcdCAqL1xyXG5cdFx0aGVhZGVyLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRfYXV0aC4kdW5hdXRoKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ3VycmVudGx5IGFjdGl2ZSBuYXYgaXRlbSB3aGVuICcvJyBpbmRleFxyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXHJcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuXHRcdCAqL1xyXG5cdFx0aGVhZGVyLmluZGV4SXNBY3RpdmUgPSBmdW5jdGlvbihwYXRoKSB7XHJcblx0XHRcdC8vIHBhdGggc2hvdWxkIGJlICcvJ1xyXG5cdFx0XHRyZXR1cm4gJGxvY2F0aW9uLnBhdGgoKSA9PT0gcGF0aDtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDdXJyZW50bHkgYWN0aXZlIG5hdiBpdGVtXHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIubmF2SXNBY3RpdmUgPSBmdW5jdGlvbihwYXRoKSB7XHJcblx0XHRcdHJldHVybiAkbG9jYXRpb24ucGF0aCgpLnN1YnN0cigwLCBwYXRoLmxlbmd0aCkgPT09IHBhdGg7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCduYXZDb250cm9sJywgbmF2Q29udHJvbCk7XG5cblx0bmF2Q29udHJvbC4kaW5qZWN0ID0gWydtZWRpYUNoZWNrJywgJ01RJywgJyR0aW1lb3V0J107XG5cblx0ZnVuY3Rpb24gbmF2Q29udHJvbChtZWRpYUNoZWNrLCBNUSwgJHRpbWVvdXQpIHtcblxuXHRcdG5hdkNvbnRyb2xMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbWVudCcsICckYXR0cnMnXTtcblxuXHRcdGZ1bmN0aW9uIG5hdkNvbnRyb2xMaW5rKCRzY29wZSkge1xuXHRcdFx0Ly8gZGF0YSBvYmplY3Rcblx0XHRcdCRzY29wZS5uYXYgPSB7fTtcblxuXHRcdFx0dmFyIF9ib2R5ID0gYW5ndWxhci5lbGVtZW50KCdib2R5JyksXG5cdFx0XHRcdF9uYXZPcGVuO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIE9wZW4gbW9iaWxlIG5hdmlnYXRpb25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfb3Blbk5hdigpIHtcblx0XHRcdFx0X2JvZHlcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ25hdi1jbG9zZWQnKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnbmF2LW9wZW4nKTtcblxuXHRcdFx0XHRfbmF2T3BlbiA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xvc2UgbW9iaWxlIG5hdmlnYXRpb25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfY2xvc2VOYXYoKSB7XG5cdFx0XHRcdF9ib2R5XG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCduYXYtb3BlbicpXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduYXYtY2xvc2VkJyk7XG5cblx0XHRcdFx0X25hdk9wZW4gPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gZW50ZXJpbmcgbW9iaWxlIG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKiBDbG9zZSBuYXYgYW5kIHNldCB1cCBtZW51IHRvZ2dsaW5nIGZ1bmN0aW9uYWxpdHlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZW50ZXJNb2JpbGUoKSB7XG5cdFx0XHRcdF9jbG9zZU5hdigpO1xuXG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHQgKiBUb2dnbGUgbW9iaWxlIG5hdmlnYXRpb24gb3Blbi9jbG9zZWRcblx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHQkc2NvcGUubmF2LnRvZ2dsZU5hdiA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICghX25hdk9wZW4pIHtcblx0XHRcdFx0XHRcdFx0X29wZW5OYXYoKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdF9jbG9zZU5hdigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCRzY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN0YXJ0JywgX2Nsb3NlTmF2KTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gZXhpdGluZyBtb2JpbGUgbWVkaWEgcXVlcnlcblx0XHRcdCAqIERpc2FibGUgbWVudSB0b2dnbGluZyBhbmQgcmVtb3ZlIGJvZHkgY2xhc3Nlc1xuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9leGl0TW9iaWxlKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLm5hdi50b2dnbGVOYXYgPSBudWxsO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRfYm9keS5yZW1vdmVDbGFzcygnbmF2LWNsb3NlZCBuYXYtb3BlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgZnVuY3Rpb25hbGl0eSB0byBydW4gb24gZW50ZXIvZXhpdCBvZiBtZWRpYSBxdWVyeVxuXHRcdFx0bWVkaWFDaGVjay5pbml0KHtcblx0XHRcdFx0c2NvcGU6ICRzY29wZSxcblx0XHRcdFx0bXE6IE1RLlNNQUxMLFxuXHRcdFx0XHRlbnRlcjogX2VudGVyTW9iaWxlLFxuXHRcdFx0XHRleGl0OiBfZXhpdE1vYmlsZVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogbmF2Q29udHJvbExpbmtcblx0XHR9O1xuXHR9XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBMb2dpbkN0cmwpO1xuXG5cdExvZ2luQ3RybC4kaW5qZWN0ID0gWydGaXJlJywgJyRzY29wZScsICdPQVVUSCcsICckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICdsb2NhbERhdGEnLCAnTVEnLCAnbWVkaWFDaGVjayddO1xuXG5cdGZ1bmN0aW9uIExvZ2luQ3RybChGaXJlLCAkc2NvcGUsIE9BVVRILCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sIGxvY2FsRGF0YSwgTVEsIG1lZGlhQ2hlY2spIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGxvZ2luID0gdGhpcztcblxuXHRcdC8vIEZpcmViYXNlIGF1dGhlbnRpY2F0aW9uXG5cdFx0dmFyIF9hdXRoID0gRmlyZS5hdXRoKCk7XG5cblx0XHQvKipcblx0XHQgKiBMb2NhbCBkYXRhIHN1Y2Nlc3NmdWxseSByZXRyaWV2ZWRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRhIHtqc29ufVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2xvY2FsRGF0YVN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0bG9naW4ubG9jYWxEYXRhID0gZGF0YTtcblx0XHR9XG5cdFx0bG9jYWxEYXRhLmdldEpTT04oKS50aGVuKF9sb2NhbERhdGFTdWNjZXNzKTtcblxuXHRcdGxvZ2luLmxvZ2lucyA9IE9BVVRILkxPR0lOUztcblxuXHRcdC8qKlxuXHRcdCAqIEF1dGhlbnRpY2F0ZSB0aGUgdXNlciB2aWEgT2F1dGggd2l0aCB0aGUgc3BlY2lmaWVkIHByb3ZpZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSAodHdpdHRlciwgZmFjZWJvb2ssIGdpdGh1YiwgZ29vZ2xlKVxuXHRcdCAqL1xuXHRcdGxvZ2luLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG5cdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSB0cnVlO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFN1Y2Nlc3NmdWxseSBhdXRoZW50aWNhdGVkXG5cdFx0XHQgKiBHbyB0byBpbml0aWFsbHkgaW50ZW5kZWQgYXV0aGVudGljYXRlZCBwYXRoXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHJlc3BvbnNlIHtvYmplY3R9IHByb21pc2UgcmVzcG9uc2Vcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9hdXRoU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSBmYWxzZTtcblxuXHRcdFx0XHRpZiAoJHJvb3RTY29wZS5hdXRoUGF0aCkge1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCRyb290U2NvcGUuYXV0aFBhdGgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGYWlsZWQgdG8gYXV0aGVudGljYXRlXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIGVycm9yXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXV0aEVycm9yKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycm9yLmRhdGEpO1xuXHRcdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSAnZXJyb3InO1xuXHRcdFx0XHRsb2dpbi5sb2dpbk1zZyA9ICcnXG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVXNlIHBvcHVwIHRvIGxvZyBpbiAobGFyZ2Ugdmlld3BvcnQpXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2F1dGhXaXRoUG9wdXAoKSB7XG5cdFx0XHRcdF9hdXRoLiRhdXRoV2l0aE9BdXRoUG9wdXAocHJvdmlkZXIpXG5cdFx0XHRcdFx0LnRoZW4oX2F1dGhTdWNjZXNzKVxuXHRcdFx0XHRcdC5jYXRjaChfYXV0aEVycm9yKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBVc2UgcmVkaXJlY3QgdG8gbG9nIGluIChzbWFsbCB2aWV3cG9ydClcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXV0aFdpdGhSZWRpcmVjdCgpIHtcblx0XHRcdFx0X2F1dGguJGF1dGhXaXRoT0F1dGhSZWRpcmVjdChwcm92aWRlciwgX2F1dGhFcnJvcik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogSW5pdGlhbGl6ZSBtZWRpYUNoZWNrXG5cdFx0XHQgKiBXaGVuIHNtYWxsIE1RLCByZWRpcmVjdCB3aXRoIE9hdXRoXG5cdFx0XHQgKiBXaGVuIGxhcmdlIE1RLCBsb2cgaW4gd2l0aCBPYXV0aCBwb3B1cFxuXHRcdFx0ICovXG5cdFx0XHRtZWRpYUNoZWNrLmluaXQoe1xuXHRcdFx0XHRzY29wZTogJHNjb3BlLFxuXHRcdFx0XHRtcTogTVEuU01BTEwsXG5cdFx0XHRcdGVudGVyOiBfYXV0aFdpdGhSZWRpcmVjdCxcblx0XHRcdFx0ZXhpdDogX2F1dGhXaXRoUG9wdXBcblx0XHRcdH0pO1xuXHRcdH07XG5cdH1cbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9