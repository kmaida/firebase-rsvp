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

		/**
		 * Determine if admin can be shown or if error message should be shown
		 *
		 * @private
		 */
		function _showAdmin() {
			admin.showAdmin = admin.user.uid === admin.data.master;
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

			if (next && next.$$route) {
				if (next.$$route.secure && !_isAuthenticated) {
					$rootScope.authPath = $location.path();

					$rootScope.$evalAsync(function() {
						// send user to login
						$location.path('/login');
					});
				}

				if (next.$$route.originalPath === '/login' && _isAuthenticated) {
					$rootScope.$evalAsync(function() {
						if ($rootScope.authPath) {
							$location.path($rootScope.authPath);
						} else {
							$location.path('/');
						}
					});
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

	LoginCtrl.$inject = ['Fire', '$scope', 'OAUTH', '$rootScope', '$location', 'localData', 'MQ', 'mediaCheck'];

	function LoginCtrl(Fire, $scope, OAUTH, $rootScope, $location, localData, MQ, mediaCheck) {
		// controllerAs ViewModel
		var login = this;

		// Firebase authentication
		var _auth = Fire.auth();

		_auth.$onAuth(function(authData) {
			if (authData) {
				$location.path('/');
			}
		});

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

			// initialize mediaCheck
			mediaCheck.init({
				scope: $scope,
				mq: MQ.SMALL,
				enter: _authWithRedirect,
				exit: _authWithPopup
			});
		};
	}
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUuanMiLCJhY2NvdW50L0FjY291bnQuY3RybC5qcyIsImFkbWluL0FkbWluLmN0cmwuanMiLCJhZG1pbi9BZG1pbkV2ZW50TGlzdC5jdHJsLmpzIiwiYWRtaW4vRWRpdEV2ZW50LmN0cmwuanMiLCJhZG1pbi9ldmVudEZvcm0uZGlyLmpzIiwiYWRtaW4vdmFsaWRhdGVEYXRlRnV0dXJlLmRpci5qcyIsImFkbWluL3ZpZXdFdmVudEd1ZXN0cy5kaXIuanMiLCJjb3JlL0V2ZW50LmZhY3RvcnkuanMiLCJjb3JlL0ZpcmUuZmFjdG9yeS5qcyIsImNvcmUvTVEuY29uc3RhbnQuanMiLCJjb3JlL09BVVRILmNvbnN0YW50LmpzIiwiY29yZS9VdGlscy5mYWN0b3J5LmpzIiwiY29yZS9hcHAuYXV0aC5qcyIsImNvcmUvYXBwLmNvbmZpZy5qcyIsImNvcmUvZGV0ZWN0QWRCbG9jay5kaXIuanMiLCJjb3JlL2xvY2FsRGF0YS5zZXJ2aWNlLmpzIiwiY29yZS9tZWRpYUNoZWNrLnNlcnZpY2UuanMiLCJjb3JlL3RydXN0QXNIVE1MLmZpbHRlci5qcyIsImNvcmUvdmlld1N3aXRjaC5kaXIuanMiLCJldmVudC1kZXRhaWwvRXZlbnREZXRhaWwuY3RybC5qcyIsImV2ZW50LWRldGFpbC9yc3ZwRm9ybS5kaXIuanMiLCJldmVudHMvRXZlbnRzLmN0cmwuanMiLCJldmVudHMvcHJldHR5RGF0ZS5maWx0ZXIuanMiLCJoZWFkZXIvSGVhZGVyLmN0cmwuanMiLCJoZWFkZXIvbmF2Q29udHJvbC5kaXIuanMiLCJsb2dpbi9Mb2dpbi5jdHJsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im5nLWFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXJcblx0Lm1vZHVsZSgnbXlBcHAnLCBbJ2ZpcmViYXNlJywgJ25nUm91dGUnLCAnbmdSZXNvdXJjZScsICduZ1Nhbml0aXplJywgJ25nTWVzc2FnZXMnLCAnbWVkaWFDaGVjaycsICd1aS5ib290c3RyYXAnXSk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignQWNjb3VudEN0cmwnLCBBY2NvdW50Q3RybCk7XG5cblx0QWNjb3VudEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdGaXJlJywgJ1V0aWxzJywgJ09BVVRIJywgJyR0aW1lb3V0J107XG5cblx0ZnVuY3Rpb24gQWNjb3VudEN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIEZpcmUsIFV0aWxzLCBPQVVUSCwgJHRpbWVvdXQpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGFjY291bnQgPSB0aGlzO1xuXG5cdFx0Ly8gVE9ETzogc2hvdyB1c2VyJ3MgZ2VuZXJhbCBpbmZvcm1hdGlvblxuXHRcdC8vIFRPRE86IHNob3cgdXNlcidzIFJTVlBzXG5cdFx0Ly8gVE9ETzogcmVtb3ZlIHRhYnMgKG5vdCBuZWNlc3NhcnkpXG5cblx0XHRhY2NvdW50LmRhdGEgPSBGaXJlLmRhdGEoKTtcblxuXHRcdC8vIGdldCB1c2VyIHN5bmNocm9ub3VzbHkgYW5kIGdyYWIgbmVjZXNzYXJ5IGRhdGEgdG8gZGlzcGxheVxuXHRcdGFjY291bnQudXNlciA9IEZpcmUucmVmLmdldEF1dGgoKTtcblx0XHRhY2NvdW50LmxvZ2lucyA9IE9BVVRILkxPR0lOUztcblxuXHRcdHZhciBfcHJvdmlkZXIgPSBhY2NvdW50LnVzZXIucHJvdmlkZXI7XG5cdFx0dmFyIF9wcm9maWxlID0gYWNjb3VudC51c2VyW19wcm92aWRlcl0uY2FjaGVkVXNlclByb2ZpbGU7XG5cblx0XHRhY2NvdW50LnVzZXJOYW1lID0gYWNjb3VudC51c2VyW19wcm92aWRlcl0uZGlzcGxheU5hbWU7XG5cdFx0YWNjb3VudC51c2VyUGljdHVyZSA9IFV0aWxzLmdldFVzZXJQaWN0dXJlKGFjY291bnQudXNlcik7XG5cblx0XHR2YXIgcnN2cERhdGEgPSBGaXJlLnJzdnBzKCk7XG5cblx0XHRmdW5jdGlvbiBfZ2V0TXlSc3ZwcyhkYXRhKSB7XG5cdFx0XHRhY2NvdW50LnJzdnBzID0gW107XG5cblx0XHRcdHZhciBfYWxsUnN2cHMgPSBkYXRhO1xuXG5cdFx0XHRmb3IgKHZhciBuID0gMDsgbiA8IF9hbGxSc3Zwcy5sZW5ndGg7IG4rKykge1xuXHRcdFx0XHR2YXIgX3RoaXMgPSBfYWxsUnN2cHNbbl07XG5cblx0XHRcdFx0aWYgKF90aGlzLnVzZXJJZCA9PT0gYWNjb3VudC51c2VyLnVpZCkge1xuXHRcdFx0XHRcdGFjY291bnQucnN2cHMucHVzaChfdGhpcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0YWNjb3VudC5yc3Zwc1JlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyc3ZwRGF0YS4kbG9hZGVkKCkudGhlbihfZ2V0TXlSc3Zwcyk7XG5cblx0XHR2YXIgX3RhYiA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuXG5cdFx0YWNjb3VudC50YWJzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnVXNlciBJbmZvJyxcblx0XHRcdFx0cXVlcnk6ICd1c2VyLWluZm8nXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnUlNWUHMnLFxuXHRcdFx0XHRxdWVyeTogJ3JzdnBzJ1xuXHRcdFx0fVxuXHRcdF07XG5cblx0XHRhY2NvdW50LmN1cnJlbnRUYWIgPSBfdGFiID8gX3RhYiA6ICd1c2VyLWluZm8nO1xuXG5cdFx0LyoqXG5cdFx0ICogQ2hhbmdlIHRhYnMgYnkgd2F0Y2hpbmcgZm9yIHJvdXRlIHVwZGF0ZVxuXHRcdCAqL1xuXHRcdCRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0KSB7XG5cdFx0XHRhY2NvdW50LmN1cnJlbnRUYWIgPSBuZXh0LnBhcmFtcy52aWV3IHx8ICd1c2VyLWluZm8nO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0ICogR2V0IHVzZXIncyBwcm9maWxlIGluZm9ybWF0aW9uXG5cdFx0ICovXG5cdFx0YWNjb3VudC5nZXRQcm9maWxlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgdXNlcidzIHByb2ZpbGUgZGF0YVxuXHRcdFx0ICogU2hvdyBBY2NvdW50IFVJXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gcHJvbWlzZSBwcm92aWRlZCBieSAkaHR0cCBzdWNjZXNzXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZ2V0VXNlclN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0XHRhY2NvdW50LnVzZXIgPSBkYXRhO1xuXHRcdFx0XHRhY2NvdW50LmFkbWluaXN0cmF0b3IgPSBhY2NvdW50LnVzZXIuaXNBZG1pbjtcblx0XHRcdFx0YWNjb3VudC5saW5rZWRBY2NvdW50cyA9IFVzZXIuZ2V0TGlua2VkQWNjb3VudHMoYWNjb3VudC51c2VyLCAnYWNjb3VudCcpO1xuXHRcdFx0XHRhY2NvdW50LnNob3dBY2NvdW50ID0gdHJ1ZTtcblx0XHRcdFx0YWNjb3VudC5yc3ZwcyA9IGFjY291bnQudXNlci5yc3Zwcztcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgZXJyb3IgQVBJIGNhbGwgZ2V0dGluZyB1c2VyJ3MgcHJvZmlsZSBkYXRhXG5cdFx0XHQgKiBTaG93IGFuIGVycm9yIGFsZXJ0IGluIHRoZSBVSVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSBlcnJvclxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dldFVzZXJFcnJvcihlcnJvcikge1xuXHRcdFx0XHRhY2NvdW50LmVycm9yR2V0dGluZ1VzZXIgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR1c2VyRGF0YS5nZXRVc2VyKCkudGhlbihfZ2V0VXNlclN1Y2Nlc3MsIF9nZXRVc2VyRXJyb3IpO1xuXHRcdH07XG5cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBBZG1pbkN0cmwpO1xuXG5cdEFkbWluQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgJ0ZpcmUnXTtcblxuXHRmdW5jdGlvbiBBZG1pbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIEZpcmUpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGFkbWluID0gdGhpcztcblxuXHRcdGFkbWluLnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHQvLyBnZXQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZVxuXHRcdGFkbWluLmRhdGEgPSBGaXJlLmRhdGEoKTtcblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZSBpZiBhZG1pbiBjYW4gYmUgc2hvd24gb3IgaWYgZXJyb3IgbWVzc2FnZSBzaG91bGQgYmUgc2hvd25cblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX3Nob3dBZG1pbigpIHtcblx0XHRcdGFkbWluLnNob3dBZG1pbiA9IGFkbWluLnVzZXIudWlkID09PSBhZG1pbi5kYXRhLm1hc3Rlcjtcblx0XHR9XG5cdFx0YWRtaW4uZGF0YS4kbG9hZGVkKCkudGhlbihfc2hvd0FkbWluKTtcblxuXHRcdHZhciBfdGFiID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZpZXc7XG5cblx0XHRhZG1pbi50YWJzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnRXZlbnRzJyxcblx0XHRcdFx0cXVlcnk6ICdldmVudHMnXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnQWRkIEV2ZW50Jyxcblx0XHRcdFx0cXVlcnk6ICdhZGQtZXZlbnQnXG5cdFx0XHR9XG5cdFx0XTtcblxuXHRcdGFkbWluLmN1cnJlbnRUYWIgPSBfdGFiID8gX3RhYiA6ICdldmVudHMnO1xuXG5cdFx0LyoqXG5cdFx0ICogQ2hhbmdlIHRhYnMgYnkgd2F0Y2hpbmcgZm9yIHJvdXRlIHVwZGF0ZVxuXHRcdCAqL1xuXHRcdCRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0KSB7XG5cdFx0XHRhZG1pbi5jdXJyZW50VGFiID0gbmV4dC5wYXJhbXMudmlldyB8fCAnZXZlbnRzJztcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIFNob3cgUlNWUGVkIGd1ZXN0IG1vZGFsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRJZCB7c3RyaW5nfSBldmVudCBJRCB0byBnZXQgUlNWUHMgZm9yXG5cdFx0ICogQHBhcmFtIGV2ZW50TmFtZSB7c3RyaW5nfSBldmVudCBuYW1lIHRvIGdldCBSU1ZQcyBmb3Jcblx0XHQgKi9cblx0XHRhZG1pbi5zaG93R3Vlc3RzID0gZnVuY3Rpb24oZXZlbnRJZCwgZXZlbnROYW1lKSB7XG5cdFx0XHRhZG1pbi5zaG93R3Vlc3RzRXZlbnRJZCA9IGV2ZW50SWQ7XG5cdFx0XHRhZG1pbi5zaG93R3Vlc3RzRXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdFx0YWRtaW4uc2hvd01vZGFsID0gdHJ1ZTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FkbWluRXZlbnRMaXN0Q3RybCcsIEFkbWluRXZlbnRMaXN0Q3RybCk7XG5cblx0QWRtaW5FdmVudExpc3RDdHJsLiRpbmplY3QgPSBbJ0ZpcmUnLCAnJGxvY2F0aW9uJywgJyR0aW1lb3V0JywgJ0V2ZW50J107XG5cblx0ZnVuY3Rpb24gQWRtaW5FdmVudExpc3RDdHJsKEZpcmUsICRsb2NhdGlvbiwgJHRpbWVvdXQsIEV2ZW50KSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhRXZ0ID0gdGhpcztcblxuXHRcdGFFdnQuZXZ0VXJsID0gJGxvY2F0aW9uLnByb3RvY29sKCkgKyAnOi8vJyArICRsb2NhdGlvbi5ob3N0KCkgKyAnL2V2ZW50Lyc7XG5cblx0XHQvKipcblx0XHQgKiBIaWRlIFVSTCBpbnB1dCBmaWVsZCB3aGVuIGJsdXJyZWRcblx0XHQgKi9cblx0XHRhRXZ0LmJsdXJVcmxJbnB1dCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0YUV2dC5jb3B5SW5wdXQgPSBudWxsO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBTaG93IFVSTCBpbnB1dCBmaWVsZCB3aGVuIElEIGxpbmsgaXMgY2xpY2tlZFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGluZGV4XG5cdFx0ICovXG5cdFx0YUV2dC5zaG93VXJsSW5wdXQgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0YUV2dC5jb3B5SW5wdXQgPSBpbmRleDtcblxuXHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFuZ3VsYXIuZWxlbWVudCgnI2UnICsgaW5kZXgpLmZpbmQoJ2lucHV0Jykuc2VsZWN0KCk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0Ly8gZ2V0IGV2ZW50cyBmcm9tIEZpcmViYXNlXG5cdFx0YUV2dC5ldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0LyoqXG5cdFx0ICogQ3VzdG9tIHNvcnQgZnVuY3Rpb25cblx0XHQgKiBHZXQgZXZlbnQgc3RhcnQgZGF0ZSBhbmQgY2hhbmdlIHRvIHJlYWwgZGF0ZSB0byBzb3J0IGJ5XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZ0IHtvYmplY3R9IGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtEYXRlfVxuXHRcdCAqL1xuXHRcdGFFdnQuc29ydFN0YXJ0RGF0ZSA9IGZ1bmN0aW9uKGV2dCkge1xuXHRcdFx0cmV0dXJuIEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZ0LnN0YXJ0RGF0ZSwgZXZ0LnN0YXJ0VGltZSk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdFZGl0RXZlbnRDdHJsJywgRWRpdEV2ZW50Q3RybCk7XG5cblx0RWRpdEV2ZW50Q3RybC4kaW5qZWN0ID0gWydGaXJlJywgJyRyb3V0ZVBhcmFtcycsICckbG9jYXRpb24nLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiBFZGl0RXZlbnRDdHJsKEZpcmUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uLCAkdGltZW91dCkge1xuXHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHR2YXIgZWRpdCA9IHRoaXM7XG5cblx0XHQvLyBnZXQgdGhlIGV2ZW50IElEXG5cdFx0dmFyIF9ldmVudElkID0gJHJvdXRlUGFyYW1zLmV2ZW50SWQ7XG5cblx0XHQvLyBnZXQgZXZlbnRzXG5cdFx0dmFyIGV2ZW50cyA9IEZpcmUuZXZlbnRzKCk7XG5cblx0XHQvLyB0YWJzXG5cdFx0ZWRpdC50YWJzID0gWydVcGRhdGUgRGV0YWlscycsICdEZWxldGUgRXZlbnQnXTtcblx0XHRlZGl0LmN1cnJlbnRUYWIgPSAwO1xuXG5cdFx0LyoqXG5cdFx0ICogU3dpdGNoIHRhYnNcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpbmRleCB7bnVtYmVyfSB0YWIgaW5kZXhcblx0XHQgKi9cblx0XHRlZGl0LmNoYW5nZVRhYiA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRlZGl0LmN1cnJlbnRUYWIgPSBpbmRleDtcblx0XHR9O1xuXG5cdFx0Ly8gc3luY2hyb25vdXNseSByZXRyaWV2ZSB1c2VyIGRhdGFcblx0XHRlZGl0LnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHQvLyBnZXQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZVxuXHRcdGVkaXQuZGF0YSA9IEZpcmUuZGF0YSgpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyBzaW5nbGUgZXZlbnQgZGV0YWlsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7b2JqZWN0fSBldmVudHMgZGF0YVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2V2ZW50U3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRlZGl0LmVkaXRFdmVudCA9IGV2ZW50cy4kZ2V0UmVjb3JkKF9ldmVudElkKTtcblx0XHRcdGVkaXQuc2hvd0VkaXRGb3JtID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRldmVudHMuJGxvYWRlZChfZXZlbnRTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlc2V0IHRoZSBkZWxldGUgYnV0dG9uIHRvIGRlZmF1bHQgc3RhdGVcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2J0bkRlbGV0ZVJlc2V0KCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGUgPSBmYWxzZTtcblx0XHRcdGVkaXQuYnRuRGVsZXRlVGV4dCA9ICdEZWxldGUgRXZlbnQnO1xuXHRcdH1cblxuXHRcdF9idG5EZWxldGVSZXNldCgpO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gcmV0dXJuZWQgb24gc3VjY2Vzc2Z1bCBkZWxldGlvbiBvZiBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZGVsZXRlU3VjY2VzcygpIHtcblx0XHRcdGVkaXQuYnRuRGVsZXRlVGV4dCA9ICdEZWxldGVkISc7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZSA9IHRydWU7XG5cdFx0XHRlZGl0LmVkaXRFdmVudCA9IHt9O1xuXG5cdFx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9hZG1pbicpO1xuXHRcdFx0fSwgMTUwMCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gcmV0dXJuZWQgb24gZXJyb3IgZGVsZXRpbmcgZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2RlbGV0ZUVycm9yKCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0Vycm9yIGRlbGV0aW5nISc7XG5cblx0XHRcdCR0aW1lb3V0KF9idG5EZWxldGVSZXNldCwgMzAwMCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlIHRoZSBldmVudFxuXHRcdCAqL1xuXHRcdGVkaXQuZGVsZXRlRXZlbnQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciByc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0aW5nLi4uJztcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBEZWxldGUgYWxsIFJTVlBzIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGVsZXRlZCBldmVudFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9kZWxldGVSc3ZwcygpIHtcblx0XHRcdFx0YW5ndWxhci5mb3JFYWNoKHJzdnBzLCBmdW5jdGlvbihyc3ZwKSB7XG5cdFx0XHRcdFx0aWYgKHJzdnAuZXZlbnRJZCA9PT0gZWRpdC5lZGl0RXZlbnQuJGlkKSB7XG5cdFx0XHRcdFx0XHRyc3Zwcy4kcmVtb3ZlKHJzdnApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRyc3Zwcy4kbG9hZGVkKCkudGhlbihfZGVsZXRlUnN2cHMpO1xuXG5cdFx0XHQvLyBkZWxldGUgdGhlIGV2ZW50XG5cdFx0XHRldmVudHMuJHJlbW92ZShlZGl0LmVkaXRFdmVudCkudGhlbihfZGVsZXRlU3VjY2VzcywgX2RlbGV0ZUVycm9yKTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnZXZlbnRGb3JtJywgZXZlbnRGb3JtKTtcblxuXHRldmVudEZvcm0uJGluamVjdCA9IFsnRmlyZScsICckdGltZW91dCcsICckbG9jYXRpb24nLCAnJGZpbHRlcicsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIGV2ZW50Rm9ybShGaXJlLCAkdGltZW91dCwgJGxvY2F0aW9uLCAkZmlsdGVyLCBFdmVudCkge1xuXG5cdFx0ZXZlbnRGb3JtQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIGV2ZW50Rm9ybUN0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgZWYgPSB0aGlzO1xuXG5cdFx0XHQvLyBjaGVjayBpZiBmb3JtIGlzIGNyZWF0ZSBvciBlZGl0XG5cdFx0XHR2YXIgX2lzQ3JlYXRlID0gISFlZi5wcmVmaWxsTW9kZWxJZCA9PT0gZmFsc2U7XG5cdFx0XHR2YXIgX2lzRWRpdCA9ICEhZWYucHJlZmlsbE1vZGVsSWQgPT09IHRydWU7XG5cblx0XHRcdHZhciBldmVudHMgPSBGaXJlLmV2ZW50cygpO1xuXG5cdFx0XHRlZi50aW1lUmVnZXggPSAvXigwP1sxLTldfDFbMDEyXSkoOlswLTVdXFxkKSBbQVBhcF1bbU1dJC9pO1xuXG5cdFx0XHRpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRldmVudHMuJGxvYWRlZCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGVmLmZvcm1Nb2RlbCA9IGV2ZW50cy4kZ2V0UmVjb3JkKGVmLnByZWZpbGxNb2RlbElkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHByZXZlbnQgc2VsZWN0aW5nIGRhdGVzIGluIHRoZSBwYXN0XG5cdFx0XHRlZi5taW5EYXRlID0gbmV3IERhdGUoKTtcblxuXHRcdFx0ZWYuZGF0ZU9wdGlvbnMgPSB7XG5cdFx0XHRcdHNob3dXZWVrczogZmFsc2Vcblx0XHRcdH07XG5cblx0XHRcdGVmLnN0YXJ0RGF0ZU9wZW4gPSBmYWxzZTtcblx0XHRcdGVmLmVuZERhdGVPcGVuID0gZmFsc2U7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVG9nZ2xlIHRoZSBkYXRlcGlja2VyIG9wZW4vY2xvc2VkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtICRldmVudCB7b2JqZWN0fVxuXHRcdFx0ICogQHBhcmFtIGRhdGVOYW1lIHtzdHJpbmd9IHN0YXJ0RGF0ZSAvIGVuZERhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZWYudG9nZ2xlRGF0ZXBpY2tlciA9IGZ1bmN0aW9uKCRldmVudCwgZGF0ZU5hbWUpIHtcblx0XHRcdFx0JGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdCRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHRcdFx0XHRlZltkYXRlTmFtZSArICdPcGVuJ10gPSAhZWZbZGF0ZU5hbWUgKyAnT3BlbiddO1xuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUcmFuc2Zvcm0gZGF0ZXMgdG8gYSBmb3JtYXQgQW5ndWxhckZpcmUgd2lsbCBzYXZlIHRvIEZpcmViYXNlXG5cdFx0XHQgKiBBbmd1bGFyRmlyZSB3b250Zml4IGJ1ZzogaHR0cHM6Ly9naXRodWIuY29tL2ZpcmViYXNlL2FuZ3VsYXJmaXJlL2lzc3Vlcy8zODFcblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJuIHtzdHJpbmd9IG1tL2RkL3l5eXlcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2Zvcm1hdERhdGUoZGF0ZSkge1xuXHRcdFx0XHRyZXR1cm4gJGZpbHRlcignZGF0ZScpKGRhdGUsICdNTS9kZC95eXl5Jyk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogT24gc3RhcnQgZGF0ZSB2YWxpZCBibHVyLCB1cGRhdGUgZW5kIGRhdGUgaWYgZW1wdHlcblx0XHRcdCAqL1xuXHRcdFx0ZWYuc3RhcnREYXRlQmx1ciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoZWYuZm9ybU1vZGVsICYmIGVmLmZvcm1Nb2RlbC5zdGFydERhdGUgJiYgIWVmLmZvcm1Nb2RlbC5lbmREYXRlKSB7XG5cdFx0XHRcdFx0ZWYuZm9ybU1vZGVsLmVuZERhdGUgPSBfZm9ybWF0RGF0ZShlZi5mb3JtTW9kZWwuc3RhcnREYXRlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXNldCB0aGUgc3RhdGUgb2YgdGhlIGZvcm0gU3VibWl0IGJ1dHRvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9idG5TdWJtaXRSZXNldCgpIHtcblx0XHRcdFx0ZWYuYnRuU2F2ZWQgPSBmYWxzZTtcblx0XHRcdFx0ZWYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdTdWJtaXQnIDogJ1VwZGF0ZSc7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogR28gdG8gRXZlbnRzIHRhYlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9nb1RvRXZlbnRzKCkge1xuXHRcdFx0XHQkbG9jYXRpb24uc2VhcmNoKCd2aWV3JywgJ2V2ZW50cycpO1xuXHRcdFx0fVxuXG5cdFx0XHRfYnRuU3VibWl0UmVzZXQoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgZXZlbnQgQVBJIGNhbGwgc3VjY2VlZGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2V2ZW50U3VjY2VzcyhyZWYpIHtcblx0XHRcdFx0ZWYuYnRuU2F2ZWQgPSB0cnVlO1xuXHRcdFx0XHRlZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1NhdmVkIScgOiAnVXBkYXRlZCEnO1xuXG5cdFx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0XHRlZi5zaG93UmVkaXJlY3RNc2cgPSB0cnVlO1xuXHRcdFx0XHRcdCR0aW1lb3V0KF9nb1RvRXZlbnRzLCAyNTAwKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdFx0ZWYuc2hvd1VwZGF0ZURldGFpbExpbmsgPSB0cnVlO1xuXHRcdFx0XHRcdCR0aW1lb3V0KF9idG5TdWJtaXRSZXNldCwgMjUwMCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgZXZlbnQgQVBJIGNhbGwgZXJyb3Jcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXZlbnRFcnJvcihlcnIpIHtcblx0XHRcdFx0ZWYuYnRuU2F2ZWQgPSAnZXJyb3InO1xuXHRcdFx0XHRlZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ0Vycm9yIHNhdmluZyEnIDogJ0Vycm9yIHVwZGF0aW5nISc7XG5cblx0XHRcdFx0Y29uc29sZS5sb2coZWYuYnRuU3VibWl0VGV4dCwgZXJyKTtcblxuXHRcdFx0XHQkdGltZW91dChfYnRuU3VibWl0UmVzZXQsIDMwMDApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIGlmIGV2ZW50IHN0YXJ0IGFuZCBlbmQgZGF0ZXRpbWVzIGFyZSBhIHZhbGlkIHJhbmdlXG5cdFx0XHQgKiBSdW5zIG9uIGJsdXIgb2YgZXZlbnQgZGF0ZXMvdGltZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHRcdCAqL1xuXHRcdFx0ZWYudmFsaWRhdGVEYXRlcmFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKGVmLmZvcm1Nb2RlbCAmJiBlZi5mb3JtTW9kZWwuc3RhcnREYXRlICYmIGVmLmZvcm1Nb2RlbC5zdGFydFRpbWUgJiYgZWYuZm9ybU1vZGVsLmVuZERhdGUgJiYgZWYuZm9ybU1vZGVsLmVuZFRpbWUpIHtcblx0XHRcdFx0XHR2YXIgc3RhcnREYXRldGltZSA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSwgZWYuZm9ybU1vZGVsLnN0YXJ0VGltZSksXG5cdFx0XHRcdFx0XHRlbmREYXRldGltZSA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZWYuZm9ybU1vZGVsLmVuZERhdGUsIGVmLmZvcm1Nb2RlbC5lbmRUaW1lKTtcblxuXHRcdFx0XHRcdGVmLnZhbGlkRGF0ZXJhbmdlID0gKHN0YXJ0RGF0ZXRpbWUgLSBlbmREYXRldGltZSkgPCAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIENsaWNrIHN1Ym1pdCBidXR0b25cblx0XHRcdCAqIFN1Ym1pdCBuZXcgZXZlbnQgdG8gQVBJXG5cdFx0XHQgKiBGb3JtIEAgZXZlbnRGb3JtLnRwbC5odG1sXG5cdFx0XHQgKi9cblx0XHRcdGVmLnN1Ym1pdEV2ZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGVmLmZvcm1Nb2RlbC5zdGFydERhdGUgPSBfZm9ybWF0RGF0ZShlZi5mb3JtTW9kZWwuc3RhcnREYXRlKTtcblx0XHRcdFx0ZWYuZm9ybU1vZGVsLmVuZERhdGUgPSBfZm9ybWF0RGF0ZShlZi5mb3JtTW9kZWwuZW5kRGF0ZSk7XG5cblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFVwZGF0ZSBSU1ZQcyBhdHRhY2hlZCB0byB0aGlzIGV2ZW50XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRmdW5jdGlvbiBfdXBkYXRlUnN2cHMoKSB7XG5cdFx0XHRcdFx0YW5ndWxhci5mb3JFYWNoKHJzdnBzLCBmdW5jdGlvbihyc3ZwKSB7XG5cdFx0XHRcdFx0XHRpZiAocnN2cC5ldmVudElkID09PSBlZi5mb3JtTW9kZWwuJGlkICYmIHJzdnAuZXZlbnROYW1lICE9PSBlZi5mb3JtTW9kZWwudGl0bGUpIHtcblx0XHRcdFx0XHRcdFx0cnN2cC5ldmVudE5hbWUgPSBlZi5mb3JtTW9kZWwudGl0bGU7XG5cdFx0XHRcdFx0XHRcdHJzdnBzLiRzYXZlKHJzdnApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRcdGV2ZW50cy4kYWRkKGVmLmZvcm1Nb2RlbCkudGhlbihfZXZlbnRTdWNjZXNzLCBfZXZlbnRFcnJvcik7XG5cblx0XHRcdFx0fSBlbHNlIGlmIChfaXNFZGl0KSB7XG5cdFx0XHRcdFx0dmFyIHJzdnBzID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0XHRcdFx0cnN2cHMuJGxvYWRlZCgpLnRoZW4oX3VwZGF0ZVJzdnBzKTtcblx0XHRcdFx0XHRldmVudHMuJHNhdmUoZWYuZm9ybU1vZGVsKS50aGVuKF9ldmVudFN1Y2Nlc3MsIF9ldmVudEVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRwcmVmaWxsTW9kZWxJZDogJ0AnXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICcvbmctYXBwL2FkbWluL2V2ZW50Rm9ybS50cGwuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiBldmVudEZvcm1DdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZWYnLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZhbGlkYXRlRGF0ZUZ1dHVyZScsIHZhbGlkYXRlRGF0ZUZ1dHVyZSk7XG5cblx0dmFsaWRhdGVEYXRlRnV0dXJlLiRpbmplY3QgPSBbJ2V2ZW50RGF0YScsICckdGltZW91dCcsICckbG9jYXRpb24nLCAnJGZpbHRlcicsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIHZhbGlkYXRlRGF0ZUZ1dHVyZSgpIHtcblxuXHRcdHZhbGlkYXRlRGF0ZUZ1dHVyZUxpbmsuJGluamVjdCA9IFsnJHNjb3BlJywgJyRlbGVtJywgJyRhdHRycycsICduZ01vZGVsJ107XG5cblx0XHRmdW5jdGlvbiB2YWxpZGF0ZURhdGVGdXR1cmVMaW5rKCRzY29wZSwgJGVsZW0sICRhdHRycywgbmdNb2RlbCkge1xuXHRcdFx0dmFyIF9ub3cgPSBuZXcgRGF0ZSgpLFxuXHRcdFx0XHRfeWVzdGVyZGF5ID0gX25vdy5zZXREYXRlKF9ub3cuZ2V0RGF0ZSgpIC0gMSk7XG5cblx0XHRcdG5nTW9kZWwuJHBhcnNlcnMudW5zaGlmdChmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgX2QgPSBEYXRlLnBhcnNlKHZhbHVlKSxcblx0XHRcdFx0XHRfdmFsaWQgPSBfeWVzdGVyZGF5IC0gX2QgPCAwO1xuXG5cdFx0XHRcdG5nTW9kZWwuJHNldFZhbGlkaXR5KCdwYXN0RGF0ZScsIF92YWxpZCk7XG5cblx0XHRcdFx0cmV0dXJuIF92YWxpZCA/IHZhbHVlIDogdW5kZWZpbmVkO1xuXHRcdFx0fSk7XG5cblx0XHRcdG5nTW9kZWwuJGZvcm1hdHRlcnMudW5zaGlmdChmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgX2QgPSBEYXRlLnBhcnNlKHZhbHVlKSxcblx0XHRcdFx0XHRfdmFsaWQgPSBfeWVzdGVyZGF5IC0gX2QgPCAwO1xuXG5cdFx0XHRcdG5nTW9kZWwuJHNldFZhbGlkaXR5KCdwYXN0RGF0ZScsIF92YWxpZCk7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogdmFsaWRhdGVEYXRlRnV0dXJlTGlua1xuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZpZXdFdmVudEd1ZXN0cycsIHZpZXdFdmVudEd1ZXN0cyk7XG5cblx0dmlld0V2ZW50R3Vlc3RzLiRpbmplY3QgPSBbJ0ZpcmUnXTtcblxuXHRmdW5jdGlvbiB2aWV3RXZlbnRHdWVzdHMoRmlyZSkge1xuXG5cdFx0dmlld0V2ZW50R3Vlc3RzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIHZpZXdFdmVudEd1ZXN0c0N0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgZyA9IHRoaXM7XG5cblx0XHRcdHZhciByc3ZwRGF0YSA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0ZnVuY3Rpb24gX3JzdnBEYXRhTG9hZGVkKGRhdGEpIHtcblx0XHRcdFx0dmFyIF9hbGxSc3ZwcyA9IGRhdGE7XG5cblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNldCB1cCBndWVzdGxpc3QgZm9yIHZpZXdcblx0XHRcdFx0ICogU2V0IHVwIGd1ZXN0IGNvdW50cyBmb3Igdmlld1xuXHRcdFx0XHQgKlxuXHRcdFx0XHQgKiBAcGFyYW0gZXZlbnRHdWVzdHMge0FycmF5fSBndWVzdHMgd2hvIGhhdmUgUlNWUGVkIHRvIHNwZWNpZmljIGV2ZW50XG5cdFx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRmdW5jdGlvbiBfc2hvd0V2ZW50R3Vlc3RzKGV2ZW50R3Vlc3RzKSB7XG5cdFx0XHRcdFx0dmFyIF90b3RhbEd1ZXN0cyA9IDA7XG5cblx0XHRcdFx0XHRnLmd1ZXN0cyA9IGV2ZW50R3Vlc3RzO1xuXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnLmd1ZXN0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0dmFyIF90aGlzR3Vlc3QgPSBnLmd1ZXN0c1tpXTtcblxuXHRcdFx0XHRcdFx0aWYgKF90aGlzR3Vlc3QuYXR0ZW5kaW5nKSB7XG5cdFx0XHRcdFx0XHRcdF90b3RhbEd1ZXN0cyArPSBfdGhpc0d1ZXN0Lmd1ZXN0cztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRnLnRvdGFsR3Vlc3RzID0gX3RvdGFsR3Vlc3RzO1xuXHRcdFx0XHRcdGcuZ3Vlc3RzUmVhZHkgPSB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqICR3YXRjaCBldmVudCBJRCBhbmQgY29sbGVjdCB1cGRhdGVkIHNldHMgb2YgZ3Vlc3RzXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCdnLmV2ZW50SWQnLCBmdW5jdGlvbiAobmV3VmFsLCBvbGRWYWwpIHtcblx0XHRcdFx0XHRpZiAobmV3VmFsKSB7XG5cdFx0XHRcdFx0XHR2YXIgX2V2ZW50R3Vlc3RzID0gW107XG5cdFx0XHRcdFx0XHRnLmd1ZXN0c1JlYWR5ID0gZmFsc2U7XG5cblx0XHRcdFx0XHRcdGZvciAodmFyIG4gPSAwOyBuIDwgX2FsbFJzdnBzLmxlbmd0aDsgbisrKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBfdGhpc0d1ZXN0ID0gX2FsbFJzdnBzW25dO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChfdGhpc0d1ZXN0LmV2ZW50SWQgPT09IGcuZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0XHRcdF9ldmVudEd1ZXN0cy5wdXNoKF90aGlzR3Vlc3QpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdF9zaG93RXZlbnRHdWVzdHMoX2V2ZW50R3Vlc3RzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyc3ZwRGF0YS4kbG9hZGVkKCkudGhlbihfcnN2cERhdGFMb2FkZWQpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIENsb3NlIHRoaXMgbW9kYWwgZGlyZWN0aXZlXG5cdFx0XHQgKi9cblx0XHRcdGcuY2xvc2VNb2RhbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRnLnNob3dNb2RhbCA9IGZhbHNlO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRldmVudElkOiAnPScsXG5cdFx0XHRcdGV2ZW50TmFtZTogJz0nLFxuXHRcdFx0XHRzaG93TW9kYWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnL25nLWFwcC9hZG1pbi92aWV3RXZlbnRHdWVzdHMudHBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogdmlld0V2ZW50R3Vlc3RzQ3RybCxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2cnLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH1cblx0fVxufSkoKTsiLCIvLyBFdmVudCBmdW5jdGlvbnNcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZhY3RvcnkoJ0V2ZW50JywgRXZlbnQpO1xuXG5cdEV2ZW50LiRpbmplY3QgPSBbJ1V0aWxzJywgJyRmaWx0ZXInXTtcblxuXHRmdW5jdGlvbiBFdmVudChVdGlscywgJGZpbHRlcikge1xuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIGEgcHJldHR5IGRhdGUgZm9yIFVJIGRpc3BsYXkgZnJvbSB0aGUgc3RhcnQgYW5kIGVuZCBkYXRldGltZXNcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudE9iaiB7b2JqZWN0fSB0aGUgZXZlbnQgb2JqZWN0XG5cdFx0ICogQHJldHVybnMge3N0cmluZ30gcHJldHR5IHN0YXJ0IGFuZCBlbmQgZGF0ZSAvIHRpbWUgc3RyaW5nXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0UHJldHR5RGF0ZXRpbWUoZXZlbnRPYmopIHtcblx0XHRcdHZhciBzdGFydERhdGUgPSBldmVudE9iai5zdGFydERhdGUsXG5cdFx0XHRcdHN0YXJ0RCA9IG5ldyBEYXRlKHN0YXJ0RGF0ZSksXG5cdFx0XHRcdHN0YXJ0VGltZSA9IGV2ZW50T2JqLnN0YXJ0VGltZSxcblx0XHRcdFx0ZW5kRGF0ZSA9IGV2ZW50T2JqLmVuZERhdGUsXG5cdFx0XHRcdGVuZEQgPSBuZXcgRGF0ZShlbmREYXRlKSxcblx0XHRcdFx0ZW5kVGltZSA9IGV2ZW50T2JqLmVuZFRpbWUsXG5cdFx0XHRcdGRhdGVGb3JtYXRTdHIgPSAnTU1NIGQgeXl5eScsXG5cdFx0XHRcdHByZXR0eVN0YXJ0RGF0ZSA9ICRmaWx0ZXIoJ2RhdGUnKShzdGFydEQsIGRhdGVGb3JtYXRTdHIpLFxuXHRcdFx0XHRwcmV0dHlFbmREYXRlID0gJGZpbHRlcignZGF0ZScpKGVuZEQsIGRhdGVGb3JtYXRTdHIpLFxuXHRcdFx0XHRwcmV0dHlEYXRldGltZTtcblxuXHRcdFx0aWYgKHByZXR0eVN0YXJ0RGF0ZSA9PT0gcHJldHR5RW5kRGF0ZSkge1xuXHRcdFx0XHQvLyBldmVudCBzdGFydHMgYW5kIGVuZHMgb24gdGhlIHNhbWUgZGF5XG5cdFx0XHRcdC8vIEFwciAyOSAyMDE1LCAxMjowMCBQTSAtIDU6MDAgUE1cblx0XHRcdFx0cHJldHR5RGF0ZXRpbWUgPSBwcmV0dHlTdGFydERhdGUgKyAnLCAnICsgc3RhcnRUaW1lICsgJyAtICcgKyBlbmRUaW1lO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gZXZlbnQgc3RhcnRzIGFuZCBlbmRzIG9uIGRpZmZlcmVudCBkYXlzXG5cdFx0XHRcdC8vIERlYyAzMSAyMDE0LCA4OjAwIFBNIC0gSmFuIDEgMjAxNSwgMTE6MDAgQU1cblx0XHRcdFx0cHJldHR5RGF0ZXRpbWUgPSBwcmV0dHlTdGFydERhdGUgKyAnLCAnICsgc3RhcnRUaW1lICsgJyAtICcgKyBwcmV0dHlFbmREYXRlICsgJywgJyArIGVuZFRpbWU7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBwcmV0dHlEYXRldGltZTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBHZXQgSmF2YVNjcmlwdCBEYXRlIGZyb20gZXZlbnQgZGF0ZSBhbmQgdGltZSBzdHJpbmdzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0ZVN0ciB7c3RyaW5nfSBtbS9kZC95eXlcblx0XHQgKiBAcGFyYW0gdGltZVN0ciB7c3RyaW5nfSBoaDptbSBBTS9QTVxuXHRcdCAqIEByZXR1cm5zIHtEYXRlfVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldEpTRGF0ZXRpbWUoZGF0ZVN0ciwgdGltZVN0cikge1xuXHRcdFx0dmFyIGQgPSBuZXcgRGF0ZShkYXRlU3RyKSxcblx0XHRcdFx0dGltZUFyciA9IHRpbWVTdHIuc3BsaXQoJyAnKSxcblx0XHRcdFx0dGltZSA9IHRpbWVBcnJbMF0uc3BsaXQoJzonKSxcblx0XHRcdFx0aG91cnMgPSB0aW1lWzBdICogMSxcblx0XHRcdFx0bWludXRlcyA9IHRpbWVbMV0gKiAxLFxuXHRcdFx0XHRhbXBtID0gdGltZUFyclsxXSxcblx0XHRcdFx0ZnVsbGRhdGU7XG5cblx0XHRcdGlmIChhbXBtID09ICdQTScpIHtcblx0XHRcdFx0aWYgKGhvdXJzICE9PSAxMikge1xuXHRcdFx0XHRcdGhvdXJzID0gaG91cnMgKyAxMjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmdWxsZGF0ZSA9IG5ldyBEYXRlKGQuZ2V0RnVsbFllYXIoKSwgZC5nZXRNb250aCgpLCBkLmdldERhdGUoKSwgaG91cnMsIG1pbnV0ZXMpO1xuXG5cdFx0XHRyZXR1cm4gZnVsbGRhdGU7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRGV0ZXJtaW5lIGlmIGV2ZW50IGlzIGV4cGlyZWRcblx0XHQgKiAoZW5kIGRhdGUvdGltZSBoYXMgcGFzc2VkIGN1cnJlbnQgZGF0ZS90aW1lKVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBleHBpcmVkKGV2dCkge1xuXHRcdFx0dmFyIGpzU3RhcnREYXRlID0gZ2V0SlNEYXRldGltZShldnQuZW5kRGF0ZSwgZXZ0LmVuZFRpbWUpLFxuXHRcdFx0XHRub3cgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0XHRyZXR1cm4ganNTdGFydERhdGUgPCBub3c7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldFByZXR0eURhdGV0aW1lOiBnZXRQcmV0dHlEYXRldGltZSxcblx0XHRcdGdldEpTRGF0ZXRpbWU6IGdldEpTRGF0ZXRpbWUsXG5cdFx0XHRleHBpcmVkOiBleHBpcmVkXG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5mYWN0b3J5KCdGaXJlJywgRmlyZSk7XG5cblx0RmlyZS4kaW5qZWN0ID0gWyckZmlyZWJhc2VBdXRoJywgJyRmaXJlYmFzZU9iamVjdCcsICckZmlyZWJhc2VBcnJheSddO1xuXG5cdGZ1bmN0aW9uIEZpcmUoJGZpcmViYXNlQXV0aCwgJGZpcmViYXNlT2JqZWN0LCAkZmlyZWJhc2VBcnJheSkge1xuXG5cdFx0dmFyIHVyaSA9ICdodHRwczovL2ludGVuc2UtaGVhdC01ODIyLmZpcmViYXNlaW8uY29tLyc7XG5cdFx0dmFyIHJlZiA9IG5ldyBGaXJlYmFzZSh1cmkpO1xuXG5cdFx0LyoqXG5cdFx0ICogRmlyZWJhc2UgYXV0aGVudGljYXRpb24gY29udHJvbHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHsqfSBBdXRoZW50aWNhdGlvblxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGF1dGgoKSB7XG5cdFx0XHRyZXR1cm4gJGZpcmViYXNlQXV0aChyZWYpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZldGNoIEZpcmViYXNlIGRhdGFcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtvYmplY3R9IEZpcmViYXNlIGRhdGEgb2JqZWN0XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGF0YSgpIHtcblx0XHRcdHZhciBfcmVmID0gbmV3IEZpcmViYXNlKHVyaSArICdkYXRhJyk7XG5cdFx0XHRyZXR1cm4gJGZpcmViYXNlT2JqZWN0KF9yZWYpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZldGNoIEZpcmViYXNlIEV2ZW50c1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge29iamVjdH0gRmlyZWJhc2UgYXJyYXlcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBldmVudHMoKSB7XG5cdFx0XHR2YXIgX3JlZiA9IG5ldyBGaXJlYmFzZSh1cmkgKyAnZXZlbnRzJyk7XG5cdFx0XHRyZXR1cm4gJGZpcmViYXNlQXJyYXkoX3JlZik7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRmV0Y2ggRmlyZWJhc2UgUlNWUHNcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtvYmplY3R9IEZpcmViYXNlIGFycmF5XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gcnN2cHMoKSB7XG5cdFx0XHR2YXIgX3JlZiA9IG5ldyBGaXJlYmFzZSh1cmkgKyAncnN2cHMnKTtcblx0XHRcdHJldHVybiAkZmlyZWJhc2VBcnJheShfcmVmKTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dXJpOiB1cmksXG5cdFx0XHRyZWY6IHJlZixcblx0XHRcdGF1dGg6IGF1dGgsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0ZXZlbnRzOiBldmVudHMsXG5cdFx0XHRyc3ZwczogcnN2cHNcblx0XHR9XG5cdH1cbn0pKCk7IiwiLy8gbWVkaWEgcXVlcnkgY29uc3RhbnRzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb25zdGFudCgnTVEnLCB7XG5cdFx0XHRTTUFMTDogJyhtYXgtd2lkdGg6IDc2N3B4KScsXG5cdFx0XHRMQVJHRTogJyhtaW4td2lkdGg6IDc2OHB4KSdcblx0XHR9KTtcbn0pKCk7IiwiLy8gbG9naW4vT2F1dGggY29uc3RhbnRzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb25zdGFudCgnT0FVVEgnLCB7XG5cdFx0XHRMT0dJTlM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGFjY291bnQ6ICdnb29nbGUnLFxuXHRcdFx0XHRcdG5hbWU6ICdHb29nbGUnLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly9hY2NvdW50cy5nb29nbGUuY29tJ1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0YWNjb3VudDogJ3R3aXR0ZXInLFxuXHRcdFx0XHRcdG5hbWU6ICdUd2l0dGVyJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vdHdpdHRlci5jb20nXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZmFjZWJvb2snLFxuXHRcdFx0XHRcdG5hbWU6ICdGYWNlYm9vaycsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL2ZhY2Vib29rLmNvbSdcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGFjY291bnQ6ICdnaXRodWInLFxuXHRcdFx0XHRcdG5hbWU6ICdHaXRIdWInLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly9naXRodWIuY29tJ1xuXHRcdFx0XHR9XG5cdFx0XHRdXG5cdFx0fSk7XG59KSgpOyIsIi8vIFV0aWxpdHkgZnVuY3Rpb25zXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5mYWN0b3J5KCdVdGlscycsIFV0aWxzKTtcblxuXHRmdW5jdGlvbiBVdGlscygpIHtcblx0XHRmdW5jdGlvbiBnZXRVc2VyUGljdHVyZSh1c2VyKSB7XG5cdFx0XHR2YXIgX3Byb3ZpZGVyID0gdXNlci5wcm92aWRlcixcblx0XHRcdFx0X3Byb2ZpbGUgPSB1c2VyW19wcm92aWRlcl0uY2FjaGVkVXNlclByb2ZpbGU7XG5cblx0XHRcdC8vIFRPRE86IHR1cm4gdGhpcyBpbnRvIGEgaGFzaG1hcFxuXHRcdFx0aWYgKF9wcm92aWRlciA9PT0gJ2dpdGh1YicpIHtcblx0XHRcdFx0cmV0dXJuIF9wcm9maWxlLmF2YXRhcl91cmw7XG5cdFx0XHR9IGVsc2UgaWYgKF9wcm92aWRlciA9PT0gJ2dvb2dsZScpIHtcblx0XHRcdFx0cmV0dXJuIF9wcm9maWxlLnBpY3R1cmU7XG5cdFx0XHR9IGVsc2UgaWYgKF9wcm92aWRlciA9PT0gJ3R3aXR0ZXInKSB7XG5cdFx0XHRcdHJldHVybiBfcHJvZmlsZS5wcm9maWxlX2ltYWdlX3VybDtcblx0XHRcdH0gZWxzZSBpZiAoX3Byb3ZpZGVyID09PSAnZmFjZWJvb2snKSB7XG5cdFx0XHRcdHJldHVybiBfcHJvZmlsZS5waWN0dXJlLmRhdGEudXJsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEdldCBvcmRpbmFsIHZhbHVlXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gbiB7bnVtYmVyfSBpZiBhIHN0cmluZyBpcyBwcm92aWRlZCwgJSB3aWxsIGF0dGVtcHQgdG8gY29udmVydCB0byBudW1iZXJcblx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSB0aCwgc3QsIG5kLCByZFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldE9yZGluYWwobikge1xuXHRcdFx0dmFyIG9yZEFyciA9IFsndGgnLCAnc3QnLCAnbmQnLCAncmQnXSxcblx0XHRcdFx0bW9kdWx1cyA9IG4gJSAxMDA7XG5cblx0XHRcdHJldHVybiBvcmRBcnJbKG1vZHVsdXMgLSAyMCkgJSAxMF0gfHwgb3JkQXJyW21vZHVsdXNdIHx8IG9yZEFyclswXTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0VXNlclBpY3R1cmU6IGdldFVzZXJQaWN0dXJlLFxuXHRcdFx0Z2V0T3JkaW5hbDogZ2V0T3JkaW5hbFxuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQucnVuKGF1dGhSdW4pO1xuXG5cdGF1dGhSdW4uJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnRmlyZSddO1xuXG5cdGZ1bmN0aW9uIGF1dGhSdW4oJHJvb3RTY29wZSwgJGxvY2F0aW9uLCBGaXJlKSB7XG5cdFx0JHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHtcblx0XHRcdHZhciBfaXNBdXRoZW50aWNhdGVkID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xuXG5cdFx0XHRpZiAobmV4dCAmJiBuZXh0LiQkcm91dGUpIHtcblx0XHRcdFx0aWYgKG5leHQuJCRyb3V0ZS5zZWN1cmUgJiYgIV9pc0F1dGhlbnRpY2F0ZWQpIHtcblx0XHRcdFx0XHQkcm9vdFNjb3BlLmF1dGhQYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcblxuXHRcdFx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdC8vIHNlbmQgdXNlciB0byBsb2dpblxuXHRcdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG5leHQuJCRyb3V0ZS5vcmlnaW5hbFBhdGggPT09ICcvbG9naW4nICYmIF9pc0F1dGhlbnRpY2F0ZWQpIHtcblx0XHRcdFx0XHQkcm9vdFNjb3BlLiRldmFsQXN5bmMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoJHJvb3RTY29wZS5hdXRoUGF0aCkge1xuXHRcdFx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgkcm9vdFNjb3BlLmF1dGhQYXRoKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvJyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0pO1xuXHR9XG5cbn0pKCk7IiwiLy8gcm91dGVzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb25maWcoYXBwQ29uZmlnKTtcblxuXHRhcHBDb25maWcuJGluamVjdCA9IFsnJHJvdXRlUHJvdmlkZXInLCAnJGxvY2F0aW9uUHJvdmlkZXInXTtcblxuXHRmdW5jdGlvbiBhcHBDb25maWcoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cdFx0JHJvdXRlUHJvdmlkZXJcblx0XHRcdC53aGVuKCcvJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9ldmVudHMvRXZlbnRzLnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvbG9naW4nLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2xvZ2luL0xvZ2luLnZpZXcuaHRtbCdcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2V2ZW50LzpldmVudElkJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9ldmVudC1kZXRhaWwvRXZlbnREZXRhaWwudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9ldmVudC86ZXZlbnRJZC9lZGl0Jywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hZG1pbi9FZGl0RXZlbnQudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9hY2NvdW50Jywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hY2NvdW50L0FjY291bnQudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlLFxuXHRcdFx0XHRyZWxvYWRPblNlYXJjaDogZmFsc2Vcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2FkbWluJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hZG1pbi9BZG1pbi52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWUsXG5cdFx0XHRcdHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuXHRcdFx0fSlcblx0XHRcdC5vdGhlcndpc2Uoe1xuXHRcdFx0XHRyZWRpcmVjdFRvOiAnLydcblx0XHRcdH0pO1xuXG5cdFx0JGxvY2F0aW9uUHJvdmlkZXJcblx0XHRcdC5odG1sNU1vZGUoe1xuXHRcdFx0XHRlbmFibGVkOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0Lmhhc2hQcmVmaXgoJyEnKTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdkZXRlY3RBZGJsb2NrJywgZGV0ZWN0QWRibG9jayk7XG5cblx0ZGV0ZWN0QWRibG9jay4kaW5qZWN0ID0gWyckdGltZW91dCcsICckbG9jYXRpb24nXTtcblxuXHRmdW5jdGlvbiBkZXRlY3RBZGJsb2NrKCR0aW1lb3V0LCAkbG9jYXRpb24pIHtcblxuXHRcdGRldGVjdEFkYmxvY2tMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbScsICckYXR0cnMnXTtcblxuXHRcdGZ1bmN0aW9uIGRldGVjdEFkYmxvY2tMaW5rKCRzY29wZSwgJGVsZW0sICRhdHRycykge1xuXHRcdFx0Ly8gZGF0YSBvYmplY3Rcblx0XHRcdCRzY29wZS5hYiA9IHt9O1xuXG5cdFx0XHQvLyBob3N0bmFtZSBmb3IgbWVzc2FnaW5nXG5cdFx0XHQkc2NvcGUuYWIuaG9zdCA9ICRsb2NhdGlvbi5ob3N0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2hlY2sgaWYgYWRzIGFyZSBibG9ja2VkIC0gY2FsbGVkIGluICR0aW1lb3V0IHRvIGxldCBBZEJsb2NrZXJzIHJ1blxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9hcmVBZHNCbG9ja2VkKCkge1xuXHRcdFx0XHR2YXIgX2EgPSAkZWxlbS5maW5kKCcuYWQtdGVzdCcpO1xuXG5cdFx0XHRcdCRzY29wZS5hYi5ibG9ja2VkID0gX2EuaGVpZ2h0KCkgPD0gMCB8fCAhJGVsZW0uZmluZCgnLmFkLXRlc3Q6dmlzaWJsZScpLmxlbmd0aDtcblx0XHRcdH1cblxuXHRcdFx0JHRpbWVvdXQoX2FyZUFkc0Jsb2NrZWQsIDIwMCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogZGV0ZWN0QWRibG9ja0xpbmssXG5cdFx0XHR0ZW1wbGF0ZTogICAnPGRpdiBjbGFzcz1cImFkLXRlc3QgZmEtZmFjZWJvb2sgZmEtdHdpdHRlclwiIHN0eWxlPVwiaGVpZ2h0OjFweDtcIj48L2Rpdj4nICtcblx0XHRcdFx0XHRcdCc8ZGl2IG5nLWlmPVwiYWIuYmxvY2tlZFwiIGNsYXNzPVwiYWItbWVzc2FnZSBhbGVydCBhbGVydC1kYW5nZXJcIj4nICtcblx0XHRcdFx0XHRcdFx0JzxpIGNsYXNzPVwiZmEgZmEtYmFuXCI+PC9pPiA8c3Ryb25nPkFkQmxvY2s8L3N0cm9uZz4gaXMgcHJvaGliaXRpbmcgaW1wb3J0YW50IGZ1bmN0aW9uYWxpdHkhIFBsZWFzZSBkaXNhYmxlIGFkIGJsb2NraW5nIG9uIDxzdHJvbmc+e3thYi5ob3N0fX08L3N0cm9uZz4uIFRoaXMgc2l0ZSBpcyBhZC1mcmVlLicgK1xuXHRcdFx0XHRcdFx0JzwvZGl2Pidcblx0XHR9XG5cdH1cblxufSkoKTsiLCIvLyBGZXRjaCBsb2NhbCBKU09OIGRhdGFcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LnNlcnZpY2UoJ2xvY2FsRGF0YScsIGxvY2FsRGF0YSk7XG5cblx0LyoqXG5cdCAqIEdFVCBwcm9taXNlIHJlc3BvbnNlIGZ1bmN0aW9uXG5cdCAqIENoZWNrcyB0eXBlb2YgZGF0YSByZXR1cm5lZCBhbmQgc3VjY2VlZHMgaWYgSlMgb2JqZWN0LCB0aHJvd3MgZXJyb3IgaWYgbm90XG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSB7Kn0gZGF0YSBmcm9tICRodHRwXG5cdCAqIEByZXR1cm5zIHsqfSBvYmplY3QsIGFycmF5XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBfZ2V0UmVzKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcigncmV0cmlldmVkIGRhdGEgaXMgbm90IHR5cGVvZiBvYmplY3QuJyk7XG5cdFx0fVxuXHR9XG5cblx0bG9jYWxEYXRhLiRpbmplY3QgPSBbJyRodHRwJ107XG5cblx0ZnVuY3Rpb24gbG9jYWxEYXRhKCRodHRwKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IGxvY2FsIEpTT04gZGF0YSBmaWxlIGFuZCByZXR1cm4gcmVzdWx0c1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRKU09OID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmdldCgnL25nLWFwcC9kYXRhL2RhdGEuanNvbicpXG5cdFx0XHRcdC50aGVuKF9nZXRSZXMpO1xuXHRcdH1cblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgYW5ndWxhck1lZGlhQ2hlY2sgPSBhbmd1bGFyLm1vZHVsZSgnbWVkaWFDaGVjaycsIFtdKTtcblxuXHRhbmd1bGFyTWVkaWFDaGVjay5zZXJ2aWNlKCdtZWRpYUNoZWNrJywgWyckd2luZG93JywgJyR0aW1lb3V0JywgZnVuY3Rpb24gKCR3aW5kb3csICR0aW1lb3V0KSB7XG5cdFx0dGhpcy5pbml0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRcdHZhciAkc2NvcGUgPSBvcHRpb25zWydzY29wZSddLFxuXHRcdFx0XHRxdWVyeSA9IG9wdGlvbnNbJ21xJ10sXG5cdFx0XHRcdGRlYm91bmNlID0gb3B0aW9uc1snZGVib3VuY2UnXSxcblx0XHRcdFx0JHdpbiA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KSxcblx0XHRcdFx0YnJlYWtwb2ludHMsXG5cdFx0XHRcdGNyZWF0ZUxpc3RlbmVyID0gdm9pZCAwLFxuXHRcdFx0XHRoYXNNYXRjaE1lZGlhID0gJHdpbmRvdy5tYXRjaE1lZGlhICE9PSB1bmRlZmluZWQgJiYgISEkd2luZG93Lm1hdGNoTWVkaWEoJyEnKS5hZGRMaXN0ZW5lcixcblx0XHRcdFx0bXFMaXN0TGlzdGVuZXIsXG5cdFx0XHRcdG1tTGlzdGVuZXIsXG5cdFx0XHRcdGRlYm91bmNlUmVzaXplLFxuXHRcdFx0XHRtcSA9IHZvaWQgMCxcblx0XHRcdFx0bXFDaGFuZ2UgPSB2b2lkIDAsXG5cdFx0XHRcdGRlYm91bmNlU3BlZWQgPSAhIWRlYm91bmNlID8gZGVib3VuY2UgOiAyNTA7XG5cblx0XHRcdGlmIChoYXNNYXRjaE1lZGlhKSB7XG5cdFx0XHRcdG1xQ2hhbmdlID0gZnVuY3Rpb24gKG1xKSB7XG5cdFx0XHRcdFx0aWYgKG1xLm1hdGNoZXMgJiYgdHlwZW9mIG9wdGlvbnMuZW50ZXIgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdG9wdGlvbnMuZW50ZXIobXEpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuZXhpdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmV4aXQobXEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuY2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRvcHRpb25zLmNoYW5nZShtcSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNyZWF0ZUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdG1xID0gJHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KTtcblx0XHRcdFx0XHRtcUxpc3RMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBtcUNoYW5nZShtcSlcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0bXEuYWRkTGlzdGVuZXIobXFMaXN0TGlzdGVuZXIpO1xuXG5cdFx0XHRcdFx0Ly8gYmluZCB0byB0aGUgb3JpZW50YXRpb25jaGFuZ2UgZXZlbnQgYW5kIGZpcmUgbXFDaGFuZ2Vcblx0XHRcdFx0XHQkd2luLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgbXFMaXN0TGlzdGVuZXIpO1xuXG5cdFx0XHRcdFx0Ly8gY2xlYW51cCBsaXN0ZW5lcnMgd2hlbiAkc2NvcGUgaXMgJGRlc3Ryb3llZFxuXHRcdFx0XHRcdCRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0bXEucmVtb3ZlTGlzdGVuZXIobXFMaXN0TGlzdGVuZXIpO1xuXHRcdFx0XHRcdFx0JHdpbi51bmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgbXFMaXN0TGlzdGVuZXIpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIG1xQ2hhbmdlKG1xKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRyZXR1cm4gY3JlYXRlTGlzdGVuZXIoKTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnJlYWtwb2ludHMgPSB7fTtcblxuXHRcdFx0XHRtcUNoYW5nZSA9IGZ1bmN0aW9uIChtcSkge1xuXHRcdFx0XHRcdGlmIChtcS5tYXRjaGVzKSB7XG5cdFx0XHRcdFx0XHRpZiAoISFicmVha3BvaW50c1txdWVyeV0gPT09IGZhbHNlICYmICh0eXBlb2Ygb3B0aW9ucy5lbnRlciA9PT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5lbnRlcihtcSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChicmVha3BvaW50c1txdWVyeV0gPT09IHRydWUgfHwgYnJlYWtwb2ludHNbcXVlcnldID09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmV4aXQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmV4aXQobXEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKChtcS5tYXRjaGVzICYmICghYnJlYWtwb2ludHNbcXVlcnldKSB8fCAoIW1xLm1hdGNoZXMgJiYgKGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PT0gdHJ1ZSB8fCBicmVha3BvaW50c1txdWVyeV0gPT0gbnVsbCkpKSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLmNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmNoYW5nZShtcSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIGJyZWFrcG9pbnRzW3F1ZXJ5XSA9IG1xLm1hdGNoZXM7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGNvbnZlcnRFbVRvUHggPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0XHR2YXIgZW1FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cblx0XHRcdFx0XHRlbUVsZW1lbnQuc3R5bGUud2lkdGggPSAnMWVtJztcblx0XHRcdFx0XHRlbUVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZW1FbGVtZW50KTtcblx0XHRcdFx0XHRweCA9IHZhbHVlICogZW1FbGVtZW50Lm9mZnNldFdpZHRoO1xuXHRcdFx0XHRcdGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoZW1FbGVtZW50KTtcblxuXHRcdFx0XHRcdHJldHVybiBweDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgZ2V0UFhWYWx1ZSA9IGZ1bmN0aW9uICh3aWR0aCwgdW5pdCkge1xuXHRcdFx0XHRcdHZhciB2YWx1ZTtcblx0XHRcdFx0XHR2YWx1ZSA9IHZvaWQgMDtcblx0XHRcdFx0XHRzd2l0Y2ggKHVuaXQpIHtcblx0XHRcdFx0XHRcdGNhc2UgJ2VtJzpcblx0XHRcdFx0XHRcdFx0dmFsdWUgPSBjb252ZXJ0RW1Ub1B4KHdpZHRoKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9IHdpZHRoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0YnJlYWtwb2ludHNbcXVlcnldID0gbnVsbDtcblxuXHRcdFx0XHRtbUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBwYXJ0cyA9IHF1ZXJ5Lm1hdGNoKC9cXCgoLiopLS4qOlxccyooW1xcZFxcLl0qKSguKilcXCkvKSxcblx0XHRcdFx0XHRcdGNvbnN0cmFpbnQgPSBwYXJ0c1sxXSxcblx0XHRcdFx0XHRcdHZhbHVlID0gZ2V0UFhWYWx1ZShwYXJzZUludChwYXJ0c1syXSwgMTApLCBwYXJ0c1szXSksXG5cdFx0XHRcdFx0XHRmYWtlTWF0Y2hNZWRpYSA9IHt9LFxuXHRcdFx0XHRcdFx0d2luZG93V2lkdGggPSAkd2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuXG5cdFx0XHRcdFx0ZmFrZU1hdGNoTWVkaWEubWF0Y2hlcyA9IGNvbnN0cmFpbnQgPT09ICdtYXgnICYmIHZhbHVlID4gd2luZG93V2lkdGggfHwgY29uc3RyYWludCA9PT0gJ21pbicgJiYgdmFsdWUgPCB3aW5kb3dXaWR0aDtcblxuXHRcdFx0XHRcdHJldHVybiBtcUNoYW5nZShmYWtlTWF0Y2hNZWRpYSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGZha2VNYXRjaE1lZGlhUmVzaXplID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dChkZWJvdW5jZVJlc2l6ZSk7XG5cdFx0XHRcdFx0ZGVib3VuY2VSZXNpemUgPSAkdGltZW91dChtbUxpc3RlbmVyLCBkZWJvdW5jZVNwZWVkKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkd2luLmJpbmQoJ3Jlc2l6ZScsIGZha2VNYXRjaE1lZGlhUmVzaXplKTtcblxuXHRcdFx0XHQkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkd2luLnVuYmluZCgncmVzaXplJywgZmFrZU1hdGNoTWVkaWFSZXNpemUpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gbW1MaXN0ZW5lcigpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH1dKTtcbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmlsdGVyKCd0cnVzdEFzSFRNTCcsIHRydXN0QXNIVE1MKTtcblxuXHR0cnVzdEFzSFRNTC4kaW5qZWN0ID0gWyckc2NlJ107XG5cblx0ZnVuY3Rpb24gdHJ1c3RBc0hUTUwoJHNjZSkge1xuXHRcdHJldHVybiBmdW5jdGlvbiAodGV4dCkge1xuXHRcdFx0cmV0dXJuICRzY2UudHJ1c3RBc0h0bWwodGV4dCk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIvLyBGb3IgZXZlbnRzIGJhc2VkIG9uIHZpZXdwb3J0IHNpemUgLSB1cGRhdGVzIGFzIHZpZXdwb3J0IGlzIHJlc2l6ZWRcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgndmlld1N3aXRjaCcsIHZpZXdTd2l0Y2gpO1xuXG5cdHZpZXdTd2l0Y2guJGluamVjdCA9IFsnbWVkaWFDaGVjaycsICdNUScsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIHZpZXdTd2l0Y2gobWVkaWFDaGVjaywgTVEsICR0aW1lb3V0KSB7XG5cblx0XHR2aWV3U3dpdGNoTGluay4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdC8qKlxuXHRcdCAqIHZpZXdTd2l0Y2ggZGlyZWN0aXZlIGxpbmsgZnVuY3Rpb25cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSAkc2NvcGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB2aWV3U3dpdGNoTGluaygkc2NvcGUpIHtcblx0XHRcdC8vIGRhdGEgb2JqZWN0XG5cdFx0XHQkc2NvcGUudnMgPSB7fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGVudGVyIG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2VudGVyRm4oKSB7XG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkc2NvcGUudnMudmlld2Zvcm1hdCA9ICdzbWFsbCc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZXhpdCBtZWRpYSBxdWVyeVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9leGl0Rm4oKSB7XG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQkc2NvcGUudnMudmlld2Zvcm1hdCA9ICdsYXJnZSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbml0aWFsaXplIG1lZGlhQ2hlY2tcblx0XHRcdG1lZGlhQ2hlY2suaW5pdCh7XG5cdFx0XHRcdHNjb3BlOiAkc2NvcGUsXG5cdFx0XHRcdG1xOiBNUS5TTUFMTCxcblx0XHRcdFx0ZW50ZXI6IF9lbnRlckZuLFxuXHRcdFx0XHRleGl0OiBfZXhpdEZuXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRsaW5rOiB2aWV3U3dpdGNoTGlua1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignRXZlbnREZXRhaWxDdHJsJywgRXZlbnREZXRhaWxDdHJsKTtcblxuXHRFdmVudERldGFpbEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJ0ZpcmUnLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBFdmVudERldGFpbEN0cmwoJHNjb3BlLCAkcm9vdFNjb3BlLCAkcm91dGVQYXJhbXMsIEZpcmUsIEV2ZW50KSB7XG5cdFx0dmFyIGV2ZW50ID0gdGhpcztcblx0XHR2YXIgX2V2ZW50SWQgPSAkcm91dGVQYXJhbXMuZXZlbnRJZDtcblxuXHRcdGV2ZW50LmRhdGEgPSBGaXJlLmRhdGEoKTtcblxuXHRcdC8vIHN5bmNocm9ub3VzbHkgcmV0cmlldmUgdXNlciBkYXRhXG5cdFx0ZXZlbnQudXNlciA9IEZpcmUucmVmLmdldEF1dGgoKTtcblxuXHRcdGV2ZW50LnNob3dNb2RhbCA9IGZhbHNlO1xuXG5cdFx0ZXZlbnQub3BlblJzdnBNb2RhbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZXZlbnQuc2hvd01vZGFsID0gdHJ1ZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogR2V0IHVzZXIncyBSU1ZQIGZvciB0aGlzIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZXRVc2VyUnN2cCgpIHtcblx0XHRcdHZhciByc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSU1ZQcyBoYXZlIGJlZW4gZmV0Y2hlZCBzdWNjZXNzZnVsbHlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfcnN2cHNMb2FkZWRTdWNjZXNzKCkge1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJzdnBzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIHRoaXNSc3ZwID0gcnN2cHNbaV07XG5cblx0XHRcdFx0XHRpZiAodGhpc1JzdnAuZXZlbnRJZCA9PT0gX2V2ZW50SWQgJiYgdGhpc1JzdnAudXNlcklkID09PSBldmVudC51c2VyLnVpZCkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucnN2cE9iaiA9IHRoaXNSc3ZwO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXZlbnQubm9Sc3ZwID0gIWV2ZW50LnJzdnBPYmo7XG5cblx0XHRcdFx0dmFyIGd1ZXN0cyA9ICFldmVudC5ub1JzdnAgPyBldmVudC5yc3ZwT2JqLmd1ZXN0cyA6IG51bGw7XG5cblx0XHRcdFx0aWYgKCFldmVudC5ub1JzdnAgJiYgISFndWVzdHMgPT09IGZhbHNlIHx8IGd1ZXN0cyA9PSAxKSB7XG5cdFx0XHRcdFx0ZXZlbnQuZ3Vlc3RUZXh0ID0gZXZlbnQucnN2cE9iai5uYW1lICsgJyBpcyc7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZ3Vlc3RzICYmIGd1ZXN0cyA+IDEpIHtcblx0XHRcdFx0XHRldmVudC5ndWVzdFRleHQgPSBldmVudC5yc3ZwT2JqLm5hbWUgKyAnICsgJyArIChndWVzdHMgLSAxKSArICcgYXJlICc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRldmVudC5hdHRlbmRpbmdUZXh0ID0gIWV2ZW50Lm5vUnN2cCAmJiBldmVudC5yc3ZwT2JqLmF0dGVuZGluZyA/ICdhdHRlbmRpbmcnIDogJ25vdCBhdHRlbmRpbmcnO1xuXHRcdFx0XHRldmVudC5yc3ZwQnRuVGV4dCA9IGV2ZW50Lm5vUnN2cCA/ICdSU1ZQJyA6ICdVcGRhdGUgbXkgUlNWUCc7XG5cdFx0XHRcdGV2ZW50LnNob3dFdmVudERvd25sb2FkID0gZXZlbnQucnN2cE9iaiAmJiBldmVudC5yc3ZwT2JqLmF0dGVuZGluZztcblx0XHRcdFx0ZXZlbnQuY3JlYXRlT3JVcGRhdGUgPSBldmVudC5ub1JzdnAgPyAnY3JlYXRlJyA6ICd1cGRhdGUnO1xuXHRcdFx0XHRldmVudC5yc3ZwUmVhZHkgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRyc3Zwcy4kbG9hZGVkKCkudGhlbihfcnN2cHNMb2FkZWRTdWNjZXNzKTtcblx0XHR9XG5cblx0XHRfZ2V0VXNlclJzdnAoKTtcblxuXHRcdC8vIHdoZW4gUlNWUCBoYXMgYmVlbiBzdWJtaXR0ZWQsIHVwZGF0ZSB1c2VyIGRhdGFcblx0XHQkcm9vdFNjb3BlLiRvbigncnN2cFN1Ym1pdHRlZCcsIF9nZXRVc2VyUnN2cCk7XG5cblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSAuaWNzIGZpbGUgZm9yIHRoaXMgZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2dlbmVyYXRlSWNhbCgpIHtcblx0XHRcdGV2ZW50LmNhbCA9IGljcygpO1xuXG5cdFx0XHR2YXIgX3N0YXJ0RCA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZXZlbnQuZGV0YWlsLnN0YXJ0RGF0ZSwgZXZlbnQuZGV0YWlsLnN0YXJ0VGltZSksXG5cdFx0XHRcdF9lbmREID0gRXZlbnQuZ2V0SlNEYXRldGltZShldmVudC5kZXRhaWwuZW5kRGF0ZSwgZXZlbnQuZGV0YWlsLmVuZFRpbWUpO1xuXG5cdFx0XHRldmVudC5jYWwuYWRkRXZlbnQoZXZlbnQuZGV0YWlsLnRpdGxlLCBldmVudC5kZXRhaWwuZGVzY3JpcHRpb24sIGV2ZW50LmRldGFpbC5sb2NhdGlvbiwgX3N0YXJ0RCwgX2VuZEQpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIERvd25sb2FkIC5pY3MgZmlsZVxuXHRcdCAqL1xuXHRcdGV2ZW50LmRvd25sb2FkSWNzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRldmVudC5jYWwuZG93bmxvYWQoKTtcblx0XHR9O1xuXG5cdFx0dmFyIGV2ZW50cyA9IEZpcmUuZXZlbnRzKCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIHNpbmdsZSBldmVudCBkZXRhaWxcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2V2ZW50U3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRldmVudC5kZXRhaWwgPSBldmVudHMuJGdldFJlY29yZChfZXZlbnRJZCk7XG5cblx0XHRcdGlmIChldmVudC5kZXRhaWwpIHtcblx0XHRcdFx0ZXZlbnQuZGV0YWlsLnByZXR0eURhdGUgPSBFdmVudC5nZXRQcmV0dHlEYXRldGltZShldmVudC5kZXRhaWwpO1xuXHRcdFx0XHRldmVudC5kZXRhaWwuZXhwaXJlZCA9IEV2ZW50LmV4cGlyZWQoZXZlbnQuZGV0YWlsKTtcblx0XHRcdH1cblxuXHRcdFx0ZXZlbnQuZXZlbnRSZWFkeSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZXZlbnRzLiRsb2FkZWQoX2V2ZW50U3VjY2Vzcyk7XG5cblx0XHR2YXIgX3dhdGNoUnN2cFJlYWR5ID0gJHNjb3BlLiR3YXRjaCgnZXZlbnQucnN2cFJlYWR5JywgZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwpIHtcblx0XHRcdGlmIChuZXdWYWwgJiYgZXZlbnQuZGV0YWlsICYmIGV2ZW50LmRldGFpbC5yc3ZwKSB7XG5cdFx0XHRcdF9nZW5lcmF0ZUljYWwoKTtcblx0XHRcdFx0X3dhdGNoUnN2cFJlYWR5KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdyc3ZwRm9ybScsIHJzdnBGb3JtKTtcblxuXHRyc3ZwRm9ybS4kaW5qZWN0ID0gWydGaXJlJywgJyR0aW1lb3V0JywgJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiByc3ZwRm9ybShGaXJlLCAkdGltZW91dCwgJHJvb3RTY29wZSkge1xuXG5cdFx0cnN2cEZvcm1DdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG5cdFx0ZnVuY3Rpb24gcnN2cEZvcm1DdHJsKCRzY29wZSkge1xuXHRcdFx0Ly8gY29udHJvbGxlckFzIHN5bnRheFxuXHRcdFx0dmFyIHJmID0gdGhpcztcblxuXHRcdFx0Ly8gY2hlY2sgaWYgZm9ybSBpcyBjcmVhdGUgb3IgZWRpdCAoZG9lcyB0aGUgbW9kZWwgYWxyZWFkeSBleGlzdCBvciBub3QpXG5cdFx0XHR2YXIgX2lzQ3JlYXRlID0gISFyZi5mb3JtTW9kZWxJZCA9PT0gZmFsc2U7XG5cdFx0XHR2YXIgX2lzRWRpdCA9ICEhcmYuZm9ybU1vZGVsSWQgPT09IHRydWU7XG5cblx0XHRcdC8vIGdldCBSU1ZQc1xuXHRcdFx0dmFyIHJzdnBzO1xuXG5cdFx0XHRyZi5udW1iZXJSZWdleCA9IC9eKFsxLTldfDEwKSQvO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEdldCB0aGUgUlNWUCB0aGF0IHNob3VsZCBiZSBlZGl0ZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZ2V0RWRpdFJzdnAoKSB7XG5cdFx0XHRcdHJzdnBzID0gRmlyZS5yc3ZwcygpO1xuXG5cdFx0XHRcdHJzdnBzLiRsb2FkZWQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJmLmZvcm1Nb2RlbCA9IHJzdnBzLiRnZXRSZWNvcmQocmYuZm9ybU1vZGVsSWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRyc3ZwcyA9IEZpcmUucnN2cHMoKTtcblxuXHRcdFx0XHRyZi5mb3JtTW9kZWwgPSB7XG5cdFx0XHRcdFx0dXNlcklkOiByZi51c2VySWQsXG5cdFx0XHRcdFx0ZXZlbnROYW1lOiByZi5ldmVudC50aXRsZSxcblx0XHRcdFx0XHRldmVudElkOiByZi5ldmVudC4kaWQsXG5cdFx0XHRcdFx0bmFtZTogcmYudXNlck5hbWVcblx0XHRcdFx0fTtcblx0XHRcdH0gZWxzZSBpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRfZ2V0RWRpdFJzdnAoKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBXcmFwICR3YXRjaCBpbiBhIGZ1bmN0aW9uIHNvIHRoYXQgaXQgY2FuIGJlIHJlLWluaXRpYWxpemVkIGFmdGVyIGl0J3MgYmVlbiBkZXJlZ2lzdGVyZWRcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3N0YXJ0V2F0Y2hBdHRlbmRpbmcoKSB7XG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBXYXRjaCB1c2VyJ3MgYXR0ZW5kaW5nIGlucHV0IGFuZCBpZiB0cnVlLCBzZXQgZGVmYXVsdCBudW1iZXIgb2YgZ3Vlc3RzIHRvIDFcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogQHR5cGUgeyp8ZnVuY3Rpb24oKX1cblx0XHRcdFx0ICogQHByaXZhdGVcblx0XHRcdFx0ICovXG5cdFx0XHRcdHZhciBfd2F0Y2hBdHRlbmRpbmcgPSAkc2NvcGUuJHdhdGNoKCdyZi5mb3JtTW9kZWwuYXR0ZW5kaW5nJywgZnVuY3Rpb24gKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRcdFx0aWYgKG5ld1ZhbCA9PT0gdHJ1ZSAmJiAhb2xkVmFsICYmICFyZi5mb3JtTW9kZWwuZ3Vlc3RzKSB7XG5cdFx0XHRcdFx0XHRyZi5mb3JtTW9kZWwuZ3Vlc3RzID0gMTtcblxuXHRcdFx0XHRcdFx0Ly8gZGVyZWdpc3RlciAkd2F0Y2hcblx0XHRcdFx0XHRcdF93YXRjaEF0dGVuZGluZygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0YXJ0IHdhdGNoaW5nIHJmLmZvcm1Nb2RlbC5hdHRlbmRpbmdcblx0XHRcdF9zdGFydFdhdGNoQXR0ZW5kaW5nKCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmVzZXQgdGhlIHN0YXRlIG9mIHRoZSBmb3JtIFN1Ym1pdCBidXR0b25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYnRuU3VibWl0UmVzZXQoKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gZmFsc2U7XG5cdFx0XHRcdHJmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU3VibWl0IFJTVlAnIDogJ1VwZGF0ZSBSU1ZQJztcblx0XHRcdH1cblxuXHRcdFx0X2J0blN1Ym1pdFJlc2V0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIFJTVlAgQVBJIGNhbGwgc3VjY2VlZGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBTdWNjZXNzKCkge1xuXHRcdFx0XHRyZi5idG5TYXZlZCA9IHRydWU7XG5cdFx0XHRcdHJmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU3VibWl0dGVkIScgOiAnVXBkYXRlZCEnO1xuXG5cdFx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgncnN2cFN1Ym1pdHRlZCcpO1xuXG5cdFx0XHRcdC8vIHVzZXIgaGFzIHN1Ym1pdHRlZCBhbiBSU1ZQOyB1cGRhdGUgY3JlYXRlL2VkaXQgc3RhdHVzIGluIGNhc2UgdGhleSBlZGl0IHdpdGhvdXQgcmVmcmVzaGluZ1xuXHRcdFx0XHRfaXNDcmVhdGUgPSBmYWxzZTtcblx0XHRcdFx0X2lzRWRpdCA9IHRydWU7XG5cblx0XHRcdFx0Ly8gcmVzdGFydCAkd2F0Y2ggb24gcmYuZm9ybU1vZGVsLmF0dGVuZGluZ1xuXHRcdFx0XHRfc3RhcnRXYXRjaEF0dGVuZGluZygpO1xuXG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdF9idG5TdWJtaXRSZXNldCgpO1xuXHRcdFx0XHRcdHJmLnNob3dNb2RhbCA9IGZhbHNlO1xuXHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0JHJvb3RTY29wZS4kb24oJ3JzdnBTdWJtaXR0ZWQnLCBfZ2V0RWRpdFJzdnApO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBSU1ZQIEFQSSBjYWxsIGVycm9yXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBFcnJvcihlcnIpIHtcblx0XHRcdFx0cmYuYnRuU2F2ZWQgPSAnZXJyb3InO1xuXHRcdFx0XHRyZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ0Vycm9yIHN1Ym1pdHRpbmchJyA6ICdFcnJvciB1cGRhdGluZyEnO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKHJmLmJ0blN1Ym1pdFRleHQsIGVycik7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBzdWJtaXQgYnV0dG9uXG5cdFx0XHQgKiBTdWJtaXQgUlNWUCB0byBBUElcblx0XHRcdCAqIEZvcm0gQCByc3ZwRm9ybS50cGwuaHRtbFxuXHRcdFx0ICovXG5cdFx0XHRyZi5zdWJtaXRSc3ZwID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJmLmJ0blN1Ym1pdFRleHQgPSAnU2VuZGluZy4uLic7XG5cblx0XHRcdFx0aWYgKCFyZi5mb3JtTW9kZWwuYXR0ZW5kaW5nKSB7XG5cdFx0XHRcdFx0cmYuZm9ybU1vZGVsLmd1ZXN0cyA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0cnN2cHMuJGFkZChyZi5mb3JtTW9kZWwpLnRoZW4oX3JzdnBTdWNjZXNzLCBfcnN2cEVycm9yKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHRyc3Zwcy4kc2F2ZShyZi5mb3JtTW9kZWwpLnRoZW4oX3JzdnBTdWNjZXNzLCBfcnN2cEVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbGljayBmdW5jdGlvbiB0byBjbG9zZSB0aGUgbW9kYWwgd2luZG93XG5cdFx0XHQgKi9cblx0XHRcdHJmLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmYuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0ZXZlbnQ6ICc9Jyxcblx0XHRcdFx0dXNlck5hbWU6ICdAJyxcblx0XHRcdFx0dXNlcklkOiAnQCcsXG5cdFx0XHRcdGZvcm1Nb2RlbElkOiAnQCcsXG5cdFx0XHRcdHNob3dNb2RhbDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICcvbmctYXBwL2V2ZW50LWRldGFpbC9yc3ZwRm9ybS50cGwuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiByc3ZwRm9ybUN0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdyZicsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0V2ZW50c0N0cmwnLCBFdmVudHNDdHJsKTtcblxuXHRFdmVudHNDdHJsLiRpbmplY3QgPSBbJ0ZpcmUnLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBFdmVudHNDdHJsKEZpcmUsIEV2ZW50KSB7XG5cdFx0dmFyIGV2ZW50cyA9IHRoaXM7XG5cblx0XHRldmVudHMuYWxsRXZlbnRzID0gRmlyZS5ldmVudHMoKTtcblxuXHRcdC8vIHN5bmNocm9ub3VzbHkgcmV0cmlldmUgdXNlciBkYXRhXG5cdFx0ZXZlbnRzLnVzZXIgPSBGaXJlLnJlZi5nZXRBdXRoKCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIGV2ZW50cyBsaXN0XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7QXJyYXl9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2V2ZW50c1N1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMuYWxsRXZlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciB0aGlzRXZ0ID0gZXZlbnRzLmFsbEV2ZW50c1tpXTtcblxuXHRcdFx0XHR0aGlzRXZ0LnN0YXJ0RGF0ZUpTID0gRXZlbnQuZ2V0SlNEYXRldGltZSh0aGlzRXZ0LnN0YXJ0RGF0ZSwgdGhpc0V2dC5zdGFydFRpbWUpO1xuXHRcdFx0XHR0aGlzRXZ0LmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKHRoaXNFdnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRldmVudHMuZXZlbnRzUmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50cy5hbGxFdmVudHMuJGxvYWRlZCgpLnRoZW4oX2V2ZW50c1N1Y2Nlc3MpO1xuXG5cdFx0LyoqXG5cdFx0ICogQ3VzdG9tIHNvcnQgZnVuY3Rpb25cblx0XHQgKiBHZXQgZXZlbnQgc3RhcnQgZGF0ZSBhbmQgY2hhbmdlIHRvIHJlYWwgZGF0ZSB0byBzb3J0IGJ5XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZ0IHtvYmplY3R9IGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtEYXRlfVxuXHRcdCAqL1xuXHRcdGV2ZW50cy5zb3J0U3RhcnREYXRlID0gZnVuY3Rpb24oZXZ0KSB7XG5cdFx0XHRyZXR1cm4gRXZlbnQuZ2V0SlNEYXRldGltZShldnQuc3RhcnREYXRlLCBldnQuc3RhcnRUaW1lKTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmZpbHRlcigncHJldHR5RGF0ZScsIHByZXR0eURhdGUpO1xuXG5cdGZ1bmN0aW9uIHByZXR0eURhdGUoKSB7XG5cdFx0LyoqXG5cdFx0ICogVGFrZXMgYSBkYXRlIHN0cmluZyBhbmQgY29udmVydHMgaXQgdG8gYSBwcmV0dHkgZGF0ZVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGVTdHIge3N0cmluZ31cblx0XHQgKi9cblx0XHRyZXR1cm4gZnVuY3Rpb24gKGRhdGVTdHIpIHtcblx0XHRcdHZhciBkID0gbmV3IERhdGUoZGF0ZVN0ciksXG5cdFx0XHRcdG1vbnRoc0FyciA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXSxcblx0XHRcdFx0bW9udGggPSBtb250aHNBcnJbZC5nZXRNb250aCgpXSxcblx0XHRcdFx0ZGF5ID0gZC5nZXREYXRlKCksXG5cdFx0XHRcdHllYXIgPSBkLmdldEZ1bGxZZWFyKCksXG5cdFx0XHRcdHByZXR0eURhdGU7XG5cblx0XHRcdHByZXR0eURhdGUgPSBtb250aCArICcgJyArIGRheSArICcsICcgKyB5ZWFyO1xuXG5cdFx0XHRyZXR1cm4gcHJldHR5RGF0ZTtcblx0XHR9O1xuXHR9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxyXG5cdFx0LmNvbnRyb2xsZXIoJ0hlYWRlckN0cmwnLCBoZWFkZXJDdHJsKTtcclxuXHJcblx0aGVhZGVyQ3RybC4kaW5qZWN0ID0gWyckbG9jYXRpb24nLCAnbG9jYWxEYXRhJywgJ0ZpcmUnLCAnJHJvb3RTY29wZSddO1xyXG5cclxuXHRmdW5jdGlvbiBoZWFkZXJDdHJsKCRsb2NhdGlvbiwgbG9jYWxEYXRhLCBGaXJlLCAkcm9vdFNjb3BlKSB7XHJcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXHJcblx0XHR2YXIgaGVhZGVyID0gdGhpcztcclxuXHJcblx0XHQvLyBhdXRoZW50aWNhdGlvbiBjb250cm9sc1xyXG5cdFx0dmFyIF9hdXRoID0gRmlyZS5hdXRoKCk7XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBHZXQgdGhlIGxvY2FsIGRhdGEgZnJvbSBKU09OXHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIGRhdGFcclxuXHRcdCAqIEBwcml2YXRlXHJcblx0XHQgKi9cclxuXHRcdGZ1bmN0aW9uIF9sb2NhbERhdGFTdWNjZXNzKGRhdGEpIHtcclxuXHRcdFx0aGVhZGVyLmxvY2FsRGF0YSA9IGRhdGE7XHJcblx0XHR9XHJcblxyXG5cdFx0bG9jYWxEYXRhLmdldEpTT04oKS50aGVuKF9sb2NhbERhdGFTdWNjZXNzKTtcclxuXHJcblx0XHQvLyBnZXQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZVxyXG5cdFx0aGVhZGVyLmRhdGEgPSBGaXJlLmRhdGEoKTtcclxuXHRcdGhlYWRlci51c2VyID0gRmlyZS5yZWYuZ2V0QXV0aCgpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogU3VjY2VzcyBmdW5jdGlvbiBmcm9tIGF1dGhlbnRpY2F0aW5nXHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIGF1dGhEYXRhIHtvYmplY3R9XHJcblx0XHQgKi9cclxuXHRcdGZ1bmN0aW9uIF9vbkF1dGhDYihhdXRoRGF0YSkge1xyXG5cdFx0XHRoZWFkZXIudXNlciA9IGF1dGhEYXRhO1xyXG5cclxuXHRcdFx0aWYgKCFhdXRoRGF0YSkge1xyXG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIG9uIGxvZ2luIG9yIGxvZ291dFxyXG5cdFx0X2F1dGguJG9uQXV0aChfb25BdXRoQ2IpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogTG9nIHRoZSB1c2VyIG91dCBvZiB3aGF0ZXZlciBhdXRoZW50aWNhdGlvbiB0aGV5J3ZlIHNpZ25lZCBpbiB3aXRoXHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0X2F1dGguJHVuYXV0aCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEN1cnJlbnRseSBhY3RpdmUgbmF2IGl0ZW0gd2hlbiAnLycgaW5kZXhcclxuXHRcdCAqXHJcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5pbmRleElzQWN0aXZlID0gZnVuY3Rpb24ocGF0aCkge1xyXG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSAnLydcclxuXHRcdFx0cmV0dXJuICRsb2NhdGlvbi5wYXRoKCkgPT09IHBhdGg7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ3VycmVudGx5IGFjdGl2ZSBuYXYgaXRlbVxyXG5cdFx0ICpcclxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXHJcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuXHRcdCAqL1xyXG5cdFx0aGVhZGVyLm5hdklzQWN0aXZlID0gZnVuY3Rpb24ocGF0aCkge1xyXG5cdFx0XHRyZXR1cm4gJGxvY2F0aW9uLnBhdGgoKS5zdWJzdHIoMCwgcGF0aC5sZW5ndGgpID09PSBwYXRoO1xyXG5cdFx0fTtcclxuXHR9XHJcblxyXG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnbmF2Q29udHJvbCcsIG5hdkNvbnRyb2wpO1xuXG5cdG5hdkNvbnRyb2wuJGluamVjdCA9IFsnbWVkaWFDaGVjaycsICdNUScsICckdGltZW91dCddO1xuXG5cdGZ1bmN0aW9uIG5hdkNvbnRyb2wobWVkaWFDaGVjaywgTVEsICR0aW1lb3V0KSB7XG5cblx0XHRuYXZDb250cm9sTGluay4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGVsZW1lbnQnLCAnJGF0dHJzJ107XG5cblx0XHRmdW5jdGlvbiBuYXZDb250cm9sTGluaygkc2NvcGUpIHtcblx0XHRcdC8vIGRhdGEgb2JqZWN0XG5cdFx0XHQkc2NvcGUubmF2ID0ge307XG5cblx0XHRcdHZhciBfYm9keSA9IGFuZ3VsYXIuZWxlbWVudCgnYm9keScpLFxuXHRcdFx0XHRfbmF2T3BlbjtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBPcGVuIG1vYmlsZSBuYXZpZ2F0aW9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX29wZW5OYXYoKSB7XG5cdFx0XHRcdF9ib2R5XG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCduYXYtY2xvc2VkJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25hdi1vcGVuJyk7XG5cblx0XHRcdFx0X25hdk9wZW4gPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIENsb3NlIG1vYmlsZSBuYXZpZ2F0aW9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2Nsb3NlTmF2KCkge1xuXHRcdFx0XHRfYm9keVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnbmF2LW9wZW4nKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnbmF2LWNsb3NlZCcpO1xuXG5cdFx0XHRcdF9uYXZPcGVuID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGVudGVyaW5nIG1vYmlsZSBtZWRpYSBxdWVyeVxuXHRcdFx0ICogQ2xvc2UgbmF2IGFuZCBzZXQgdXAgbWVudSB0b2dnbGluZyBmdW5jdGlvbmFsaXR5XG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2VudGVyTW9iaWxlKCkge1xuXHRcdFx0XHRfY2xvc2VOYXYoKTtcblxuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogVG9nZ2xlIG1vYmlsZSBuYXZpZ2F0aW9uIG9wZW4vY2xvc2VkXG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0JHNjb3BlLm5hdi50b2dnbGVOYXYgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoIV9uYXZPcGVuKSB7XG5cdFx0XHRcdFx0XHRcdF9vcGVuTmF2KCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRfY2xvc2VOYXYoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkc2NvcGUuJG9uKCckbG9jYXRpb25DaGFuZ2VTdWNjZXNzJywgX2Nsb3NlTmF2KTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gZXhpdGluZyBtb2JpbGUgbWVkaWEgcXVlcnlcblx0XHRcdCAqIERpc2FibGUgbWVudSB0b2dnbGluZyBhbmQgcmVtb3ZlIGJvZHkgY2xhc3Nlc1xuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9leGl0TW9iaWxlKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLm5hdi50b2dnbGVOYXYgPSBudWxsO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRfYm9keS5yZW1vdmVDbGFzcygnbmF2LWNsb3NlZCBuYXYtb3BlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgZnVuY3Rpb25hbGl0eSB0byBydW4gb24gZW50ZXIvZXhpdCBvZiBtZWRpYSBxdWVyeVxuXHRcdFx0bWVkaWFDaGVjay5pbml0KHtcblx0XHRcdFx0c2NvcGU6ICRzY29wZSxcblx0XHRcdFx0bXE6IE1RLlNNQUxMLFxuXHRcdFx0XHRlbnRlcjogX2VudGVyTW9iaWxlLFxuXHRcdFx0XHRleGl0OiBfZXhpdE1vYmlsZVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogbmF2Q29udHJvbExpbmtcblx0XHR9O1xuXHR9XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBMb2dpbkN0cmwpO1xuXG5cdExvZ2luQ3RybC4kaW5qZWN0ID0gWydGaXJlJywgJyRzY29wZScsICdPQVVUSCcsICckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICdsb2NhbERhdGEnLCAnTVEnLCAnbWVkaWFDaGVjayddO1xuXG5cdGZ1bmN0aW9uIExvZ2luQ3RybChGaXJlLCAkc2NvcGUsIE9BVVRILCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sIGxvY2FsRGF0YSwgTVEsIG1lZGlhQ2hlY2spIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGxvZ2luID0gdGhpcztcblxuXHRcdC8vIEZpcmViYXNlIGF1dGhlbnRpY2F0aW9uXG5cdFx0dmFyIF9hdXRoID0gRmlyZS5hdXRoKCk7XG5cblx0XHRfYXV0aC4kb25BdXRoKGZ1bmN0aW9uKGF1dGhEYXRhKSB7XG5cdFx0XHRpZiAoYXV0aERhdGEpIHtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIF9sb2NhbERhdGFTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGxvZ2luLmxvY2FsRGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0bG9jYWxEYXRhLmdldEpTT04oKS50aGVuKF9sb2NhbERhdGFTdWNjZXNzKTtcblxuXHRcdGxvZ2luLmxvZ2lucyA9IE9BVVRILkxPR0lOUztcblxuXHRcdC8qKlxuXHRcdCAqIEF1dGhlbnRpY2F0ZSB0aGUgdXNlciB2aWEgT2F1dGggd2l0aCB0aGUgc3BlY2lmaWVkIHByb3ZpZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSAodHdpdHRlciwgZmFjZWJvb2ssIGdpdGh1YiwgZ29vZ2xlKVxuXHRcdCAqL1xuXHRcdGxvZ2luLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG5cdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSB0cnVlO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFN1Y2Nlc3NmdWxseSBhdXRoZW50aWNhdGVkXG5cdFx0XHQgKiBHbyB0byBpbml0aWFsbHkgaW50ZW5kZWQgYXV0aGVudGljYXRlZCBwYXRoXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHJlc3BvbnNlIHtvYmplY3R9IHByb21pc2UgcmVzcG9uc2Vcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9hdXRoU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSBmYWxzZTtcblxuXHRcdFx0XHRpZiAoJHJvb3RTY29wZS5hdXRoUGF0aCkge1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCRyb290U2NvcGUuYXV0aFBhdGgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGYWlsZWQgdG8gYXV0aGVudGljYXRlXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIGVycm9yXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXV0aEVycm9yKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycm9yLmRhdGEpO1xuXHRcdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSAnZXJyb3InO1xuXHRcdFx0XHRsb2dpbi5sb2dpbk1zZyA9ICcnXG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVXNlIHBvcHVwIHRvIGxvZyBpbiAobGFyZ2Ugdmlld3BvcnQpXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2F1dGhXaXRoUG9wdXAoKSB7XG5cdFx0XHRcdF9hdXRoLiRhdXRoV2l0aE9BdXRoUG9wdXAocHJvdmlkZXIpXG5cdFx0XHRcdFx0LnRoZW4oX2F1dGhTdWNjZXNzKVxuXHRcdFx0XHRcdC5jYXRjaChfYXV0aEVycm9yKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBVc2UgcmVkaXJlY3QgdG8gbG9nIGluIChzbWFsbCB2aWV3cG9ydClcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYXV0aFdpdGhSZWRpcmVjdCgpIHtcblx0XHRcdFx0X2F1dGguJGF1dGhXaXRoT0F1dGhSZWRpcmVjdChwcm92aWRlciwgX2F1dGhFcnJvcik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGluaXRpYWxpemUgbWVkaWFDaGVja1xuXHRcdFx0bWVkaWFDaGVjay5pbml0KHtcblx0XHRcdFx0c2NvcGU6ICRzY29wZSxcblx0XHRcdFx0bXE6IE1RLlNNQUxMLFxuXHRcdFx0XHRlbnRlcjogX2F1dGhXaXRoUmVkaXJlY3QsXG5cdFx0XHRcdGV4aXQ6IF9hdXRoV2l0aFBvcHVwXG5cdFx0XHR9KTtcblx0XHR9O1xuXHR9XG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==