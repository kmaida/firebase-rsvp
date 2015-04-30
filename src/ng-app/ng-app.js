angular
	.module('myApp', ['ngRoute', 'ngResource', 'ngSanitize', 'ngMessages', 'mediaCheck', 'satellizer', 'ui.bootstrap']);
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
// User functions
(function() {
	'use strict';

	angular
		.module('myApp')
		.factory('User', User);

	User.$inject = ['OAUTH'];

	function User(OAUTH) {

		/**
		 * Create array of a user's currently-linked account logins
		 *
		 * @param userObj
		 * @returns {Array}
		 */
		function getLinkedAccounts(userObj) {
			var linkedAccounts = [];

			angular.forEach(OAUTH.LOGINS, function(actObj) {
				var act = actObj.account;

				if (userObj[act]) {
					linkedAccounts.push(act);
				}
			});

			return linkedAccounts;
		}

		return {
			getLinkedAccounts: getLinkedAccounts
		};
	}
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

		return {
			getOrdinal: getOrdinal
		};
	}
})();
(function() {
	'use strict';

	angular
		.module('myApp')
		.config(authConfig)
		.run(authRun);

	authConfig.$inject = ['$authProvider'];

	function authConfig($authProvider) {
		//$authProvider.loginUrl = 'http://rsvp.kmaida.io/auth/login';
		$authProvider.loginUrl = 'http://localhost:8080/login';

		$authProvider.facebook({
			clientId: '471837599630371'
		});

		$authProvider.google({
			clientId: '1035478814047-41n8v2umgsupknvmj7q0e6n1gr4nauav.apps.googleusercontent.com'
		});

		$authProvider.twitter({
			url: '/auth/twitter'
		});

		$authProvider.github({
			clientId: 'b303ff4b216c0571f6ce'
		});
	}

	authRun.$inject = ['$rootScope', '$location', '$auth'];

	function authRun($rootScope, $location, $auth) {
		$rootScope.$on('$routeChangeStart', function(event, next, current) {
			if (next && next.$$route && next.$$route.secure && !$auth.isAuthenticated()) {
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
// User directive
(function() {
	'use strict';

	angular
		.module('myApp')
		.directive('user', user);

	user.$inject = ['userData', '$auth'];

	function user(userData, $auth) {

		/**
		 * User directive controller
		 */
		function userCtrl() {
			// controllerAs ViewModel
			var u = this;

			/**
			 * Check if the current user is authenticated
			 *
			 * @returns {boolean}
			 */
			u.isAuthenticated = function() {
				return $auth.isAuthenticated();
			};

			// API request to get the user, passing success callback function that sets the user's info
			userData.getUser().then(function(data) {
				u.user = data;
			});
		}

		return {
			restrict: 'EA',
			controller: userCtrl,
			controllerAs: 'u',
			template: '<div ng-if="u.isAuthenticated() && !!u.user" class="user clearfix"><img ng-if="!!u.user.picture" ng-src="{{u.user.picture}}" class="user-picture" /><span class="user-displayName">{{u.user.displayName}}</span></div>'
		};
	}
})();
// User API $http calls
(function() {
	'use strict';

	angular
		.module('myApp')
		.service('userData', userData);

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

	userData.$inject = ['$http'];

	function userData($http) {
		/**
		 * Get current user's data
		 *
		 * @returns {promise}
		 */
		this.getUser = function() {
			return $http
				.get('/api/me')
				.then(_getRes);
		};

		/**
		 * Update current user's profile data
		 *
		 * @param profileData {object} updated profile data
		 * @returns {promise}
		 */
		this.updateUser = function(profileData) {
			return $http
				.put('/api/me', profileData);
		};

		/**
		 * Get all users (admin authorized only)
		 *
		 * @returns {promise}
		 */
		this.getAllUsers = function() {
			return $http
				.get('/api/users')
				.then(_getRes);
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
		.controller('AdminCtrl', AdminCtrl);

	AdminCtrl.$inject = ['$scope', '$location', '$auth', 'userData', 'User', 'rsvpData'];

	function AdminCtrl($scope, $location, $auth, userData, User, rsvpData) {
		// controllerAs ViewModel
		var admin = this;

		// verify that user is admin
		userData.getUser().then(function(data) {
			admin.adminReady = true;

			if (data.isAdmin) {
				admin.showAdmin = true;
			}
		});

		/**
		 * Determines if the user is authenticated
		 *
		 * @returns {boolean}
		 */
		admin.isAuthenticated = function() {
			return $auth.isAuthenticated();
		};

		var _tab = $location.search().view;

		admin.tabs = [
			{
				name: 'Events',
				query: 'events'
			},
			{
				name: 'Add Event',
				query: 'add-event'
			},
			{
				name: 'Users',
				query: 'users'
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
		 * Function for successful API call getting user list
		 * Show Admin UI
		 * Display list of users
		 *
		 * @param data {Array} promise provided by $http success
		 * @private
		 */
		function _getAllUsersSuccess(data) {
			admin.users = data;

			angular.forEach(admin.users, function(user) {
				user.linkedAccounts = User.getLinkedAccounts(user);
			});
		}

		userData.getAllUsers().then(_getAllUsersSuccess);

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

	AdminEventListCtrl.$inject = ['eventData', '$location', '$timeout', 'Event'];

	function AdminEventListCtrl(eventData, $location, $timeout, Event) {
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

		/**
		 * Function for successful API call getting all events
		 * Show Admin Events UI
		 * Display list of events
		 *
		 * @param data {Array} promise provided by $http success
		 * @private
		 */
		function _getAllEventsSuccess(data) {
			aEvt.events = data;
			aEvt.eventsReady = true;
		}

		eventData.getAllEvents().then(_getAllEventsSuccess);

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

	eventForm.$inject = ['eventData', '$timeout', '$location', '$filter', 'Event'];

	function eventForm(eventData, $timeout, $location, $filter, Event) {

		eventFormCtrl.$inject = ['$scope'];

		function eventFormCtrl($scope) {
			// controllerAs syntax
			var ef = this;

			// check if form is create or edit
			var _isCreate = jQuery.isEmptyObject(ef.prefillModel),
				_isEdit = !jQuery.isEmptyObject(ef.prefillModel);

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
			function _eventSuccess() {
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
			function _eventError() {
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
					eventData.createEvent(ef.formModel).then(_eventSuccess, _eventError);

				} else if (_isEdit) {
					eventData.updateEvent(ef.formModel._id, ef.formModel).then(_eventSuccess, _eventError);
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
(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('EventsCtrl', EventsCtrl);

	EventsCtrl.$inject = ['$auth', 'eventData', 'Event'];

	function EventsCtrl($auth, eventData, Event) {
		var events = this;

		/**
		 * Determines if the user is authenticated
		 *
		 * @returns {boolean}
		 */
		events.isAuthenticated = function() {
			return $auth.isAuthenticated();
		};

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

		/**
		 * Clear search query
		 */
		//events.clearQuery = function() {
		//	events.query = '';
		//};
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
		.controller('HeaderCtrl', headerCtrl);

	headerCtrl.$inject = ['$scope', '$location', 'localData', '$auth', 'userData'];

	function headerCtrl($scope, $location, localData, $auth, userData) {
		// controllerAs ViewModel
		var header = this;

		function _localDataSuccess(data) {
			header.localData = data;
		}

		localData.getJSON().then(_localDataSuccess);

		/**
		 * Log the user out of whatever authentication they've signed in with
		 */
		header.logout = function() {
			header.adminUser = undefined;
			$auth.logout('/login');
		};

		/**
		 * If user is authenticated and adminUser is undefined,
		 * get the user and set adminUser boolean.
		 *
		 * Do this on first controller load (init, refresh)
		 * and subsequent location changes (ie, catching logout, login, etc).
		 *
		 * @private
		 */
		function _checkUserAdmin() {
			// if user is authenticated and not defined yet, check if they're an admin
			if ($auth.isAuthenticated() && header.adminUser === undefined) {
				userData.getUser()
					.then(function(data) {
						header.adminUser = data.isAdmin;
					});
			}
		}
		_checkUserAdmin();
		$scope.$on('$locationChangeSuccess', _checkUserAdmin);

		/**
		 * Is the user authenticated?
		 *
		 * @returns {boolean}
		 */
		header.isAuthenticated = function() {
			return $auth.isAuthenticated();
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

	LoginCtrl.$inject = ['$auth', 'OAUTH', '$rootScope', '$location', 'localData'];

	function LoginCtrl($auth, OAUTH, $rootScope, $location, localData) {
		// controllerAs ViewModel
		var login = this;

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
				}
			}

			$auth.authenticate(provider)
				.then(_authSuccess)
				.catch(function(response) {
					console.log(response.data);
					login.loggingIn = 'error';
					login.loginMsg = ''
				});
		}
	}
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5tb2R1bGUuanMiLCJhY2NvdW50L0FjY291bnQuY3RybC5qcyIsImNvcmUvRXZlbnQuZmFjdG9yeS5qcyIsImNvcmUvTVEuY29uc3RhbnQuanMiLCJjb3JlL09BVVRILmNvbnN0YW50LmpzIiwiY29yZS9Vc2VyLmZhY3RvcnkuanMiLCJjb3JlL1V0aWxzLmZhY3RvcnkuanMiLCJjb3JlL2FwcC5hdXRoLmpzIiwiY29yZS9hcHAuY29uZmlnLmpzIiwiY29yZS9kZXRlY3RBZEJsb2NrLmRpci5qcyIsImNvcmUvZXZlbnREYXRhLnNlcnZpY2UuanMiLCJjb3JlL2xvY2FsRGF0YS5zZXJ2aWNlLmpzIiwiY29yZS9tZWRpYUNoZWNrLnNlcnZpY2UuanMiLCJjb3JlL3JzdnBEYXRhLnNlcnZpY2UuanMiLCJjb3JlL3RydXN0QXNIVE1MLmZpbHRlci5qcyIsImNvcmUvdXNlci5kaXIuanMiLCJjb3JlL3VzZXJEYXRhLnNlcnZpY2UuanMiLCJjb3JlL3ZpZXdTd2l0Y2guZGlyLmpzIiwiYWRtaW4vQWRtaW4uY3RybC5qcyIsImFkbWluL0FkbWluRXZlbnRMaXN0LmN0cmwuanMiLCJhZG1pbi9FZGl0RXZlbnQuY3RybC5qcyIsImFkbWluL2V2ZW50Rm9ybS5kaXIuanMiLCJhZG1pbi92YWxpZGF0ZURhdGVGdXR1cmUuZGlyLmpzIiwiYWRtaW4vdmlld0V2ZW50R3Vlc3RzLmRpci5qcyIsImV2ZW50cy9FdmVudHMuY3RybC5qcyIsImV2ZW50cy9wcmV0dHlEYXRlLmZpbHRlci5qcyIsImV2ZW50LWRldGFpbC9FdmVudERldGFpbC5jdHJsLmpzIiwiZXZlbnQtZGV0YWlsL3JzdnBGb3JtLmRpci5qcyIsImhlYWRlci9IZWFkZXIuY3RybC5qcyIsImhlYWRlci9uYXZDb250cm9sLmRpci5qcyIsImxvZ2luL0xvZ2luLmN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJuZy1hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyXG5cdC5tb2R1bGUoJ215QXBwJywgWyduZ1JvdXRlJywgJ25nUmVzb3VyY2UnLCAnbmdTYW5pdGl6ZScsICduZ01lc3NhZ2VzJywgJ21lZGlhQ2hlY2snLCAnc2F0ZWxsaXplcicsICd1aS5ib290c3RyYXAnXSk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignQWNjb3VudEN0cmwnLCBBY2NvdW50Q3RybCk7XG5cblx0QWNjb3VudEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICckYXV0aCcsICd1c2VyRGF0YScsICckdGltZW91dCcsICdPQVVUSCcsICdVc2VyJ107XG5cblx0ZnVuY3Rpb24gQWNjb3VudEN0cmwoJHNjb3BlLCAkbG9jYXRpb24sICRhdXRoLCB1c2VyRGF0YSwgJHRpbWVvdXQsIE9BVVRILCBVc2VyKSB7XG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxuXHRcdHZhciBhY2NvdW50ID0gdGhpcztcblxuXHRcdC8vIEFsbCBhdmFpbGFibGUgbG9naW4gc2VydmljZXNcblx0XHRhY2NvdW50LmxvZ2lucyA9IE9BVVRILkxPR0lOUztcblxuXHRcdC8qKlxuXHRcdCAqIElzIHRoZSB1c2VyIGF1dGhlbnRpY2F0ZWQ/XG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHQgKi9cblx0XHRhY2NvdW50LmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRhdXRoLmlzQXV0aGVudGljYXRlZCgpO1xuXHRcdH07XG5cblx0XHR2YXIgX3RhYiA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuXG5cdFx0YWNjb3VudC50YWJzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnVXNlciBJbmZvJyxcblx0XHRcdFx0cXVlcnk6ICd1c2VyLWluZm8nXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiAnTWFuYWdlIExvZ2lucycsXG5cdFx0XHRcdHF1ZXJ5OiAnbWFuYWdlLWxvZ2lucydcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6ICdSU1ZQcycsXG5cdFx0XHRcdHF1ZXJ5OiAncnN2cHMnXG5cdFx0XHR9XG5cdFx0XTtcblxuXHRcdGFjY291bnQuY3VycmVudFRhYiA9IF90YWIgPyBfdGFiIDogJ3VzZXItaW5mbyc7XG5cblx0XHQvKipcblx0XHQgKiBDaGFuZ2UgdGFicyBieSB3YXRjaGluZyBmb3Igcm91dGUgdXBkYXRlXG5cdFx0ICovXG5cdFx0JHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIG5leHQpIHtcblx0XHRcdGFjY291bnQuY3VycmVudFRhYiA9IG5leHQucGFyYW1zLnZpZXcgfHwgJ3VzZXItaW5mbyc7XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBHZXQgdXNlcidzIHByb2ZpbGUgaW5mb3JtYXRpb25cblx0XHQgKi9cblx0XHRhY2NvdW50LmdldFByb2ZpbGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyB1c2VyJ3MgcHJvZmlsZSBkYXRhXG5cdFx0XHQgKiBTaG93IEFjY291bnQgVUlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0gZGF0YSB7b2JqZWN0fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9nZXRVc2VyU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRcdGFjY291bnQudXNlciA9IGRhdGE7XG5cdFx0XHRcdGFjY291bnQuYWRtaW5pc3RyYXRvciA9IGFjY291bnQudXNlci5pc0FkbWluO1xuXHRcdFx0XHRhY2NvdW50LmxpbmtlZEFjY291bnRzID0gVXNlci5nZXRMaW5rZWRBY2NvdW50cyhhY2NvdW50LnVzZXIsICdhY2NvdW50Jyk7XG5cdFx0XHRcdGFjY291bnQuc2hvd0FjY291bnQgPSB0cnVlO1xuXHRcdFx0XHRhY2NvdW50LnJzdnBzID0gYWNjb3VudC51c2VyLnJzdnBzO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBlcnJvciBBUEkgY2FsbCBnZXR0aW5nIHVzZXIncyBwcm9maWxlIGRhdGFcblx0XHRcdCAqIFNob3cgYW4gZXJyb3IgYWxlcnQgaW4gdGhlIFVJXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIGVycm9yXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZ2V0VXNlckVycm9yKGVycm9yKSB7XG5cdFx0XHRcdGFjY291bnQuZXJyb3JHZXR0aW5nVXNlciA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdHVzZXJEYXRhLmdldFVzZXIoKS50aGVuKF9nZXRVc2VyU3VjY2VzcywgX2dldFVzZXJFcnJvcik7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlc2V0IHByb2ZpbGUgc2F2ZSBidXR0b24gdG8gaW5pdGlhbCBzdGF0ZVxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfYnRuU2F2ZVJlc2V0KCkge1xuXHRcdFx0YWNjb3VudC5idG5TYXZlZCA9IGZhbHNlO1xuXHRcdFx0YWNjb3VudC5idG5TYXZlVGV4dCA9ICdTYXZlJztcblx0XHR9XG5cblx0XHRfYnRuU2F2ZVJlc2V0KCk7XG5cblx0XHQvKipcblx0XHQgKiBXYXRjaCBkaXNwbGF5IG5hbWUgY2hhbmdlcyB0byBjaGVjayBmb3IgZW1wdHkgb3IgbnVsbCBzdHJpbmdcblx0XHQgKiBTZXQgYnV0dG9uIHRleHQgYWNjb3JkaW5nbHlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBuZXdWYWwge3N0cmluZ30gdXBkYXRlZCBkaXNwbGF5TmFtZSB2YWx1ZSBmcm9tIGlucHV0IGZpZWxkXG5cdFx0ICogQHBhcmFtIG9sZFZhbCB7Kn0gcHJldmlvdXMgZGlzcGxheU5hbWUgdmFsdWVcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF93YXRjaERpc3BsYXlOYW1lKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRpZiAobmV3VmFsID09PSAnJyB8fCBuZXdWYWwgPT09IG51bGwpIHtcblx0XHRcdFx0YWNjb3VudC5idG5TYXZlVGV4dCA9ICdFbnRlciBOYW1lJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFjY291bnQuYnRuU2F2ZVRleHQgPSAnU2F2ZSc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCRzY29wZS4kd2F0Y2goJ2FjY291bnQudXNlci5kaXNwbGF5TmFtZScsIF93YXRjaERpc3BsYXlOYW1lKTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZSB1c2VyJ3MgcHJvZmlsZSBpbmZvcm1hdGlvblxuXHRcdCAqIENhbGxlZCBvbiBzdWJtaXNzaW9uIG9mIHVwZGF0ZSBmb3JtXG5cdFx0ICovXG5cdFx0YWNjb3VudC51cGRhdGVQcm9maWxlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcHJvZmlsZURhdGEgPSB7IGRpc3BsYXlOYW1lOiBhY2NvdW50LnVzZXIuZGlzcGxheU5hbWUgfTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBTdWNjZXNzIGNhbGxiYWNrIHdoZW4gcHJvZmlsZSBoYXMgYmVlbiB1cGRhdGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3VwZGF0ZVN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGFjY291bnQuYnRuU2F2ZWQgPSB0cnVlO1xuXHRcdFx0XHRhY2NvdW50LmJ0blNhdmVUZXh0ID0gJ1NhdmVkISc7XG5cblx0XHRcdFx0JHRpbWVvdXQoX2J0blNhdmVSZXNldCwgMjUwMCk7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRXJyb3IgY2FsbGJhY2sgd2hlbiBwcm9maWxlIHVwZGF0ZSBoYXMgZmFpbGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3VwZGF0ZUVycm9yKCkge1xuXHRcdFx0XHRhY2NvdW50LmJ0blNhdmVkID0gJ2Vycm9yJztcblx0XHRcdFx0YWNjb3VudC5idG5TYXZlVGV4dCA9ICdFcnJvciBzYXZpbmchJztcblxuXHRcdFx0XHQkdGltZW91dChfYnRuU2F2ZVJlc2V0LCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCEhYWNjb3VudC51c2VyLmRpc3BsYXlOYW1lKSB7XG5cdFx0XHRcdC8vIFNldCBzdGF0dXMgdG8gU2F2aW5nLi4uIGFuZCB1cGRhdGUgdXBvbiBzdWNjZXNzIG9yIGVycm9yIGluIGNhbGxiYWNrc1xuXHRcdFx0XHRhY2NvdW50LmJ0blNhdmVUZXh0ID0gJ1NhdmluZy4uLic7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSB1c2VyLCBwYXNzaW5nIHByb2ZpbGUgZGF0YSBhbmQgYXNzaWduaW5nIHN1Y2Nlc3MgYW5kIGVycm9yIGNhbGxiYWNrc1xuXHRcdFx0XHR1c2VyRGF0YS51cGRhdGVVc2VyKHByb2ZpbGVEYXRhKS50aGVuKF91cGRhdGVTdWNjZXNzLCBfdXBkYXRlRXJyb3IpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBMaW5rIHRoaXJkLXBhcnR5IHByb3ZpZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJcblx0XHQgKi9cblx0XHRhY2NvdW50LmxpbmsgPSBmdW5jdGlvbihwcm92aWRlcikge1xuXHRcdFx0JGF1dGgubGluayhwcm92aWRlcilcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YWNjb3VudC5nZXRQcm9maWxlKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRcdGFsZXJ0KHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVbmxpbmsgdGhpcmQtcGFydHkgcHJvdmlkZXJcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclxuXHRcdCAqL1xuXHRcdGFjY291bnQudW5saW5rID0gZnVuY3Rpb24ocHJvdmlkZXIpIHtcblx0XHRcdCRhdXRoLnVubGluayhwcm92aWRlcilcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YWNjb3VudC5nZXRQcm9maWxlKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRcdGFsZXJ0KHJlc3BvbnNlLmRhdGEgPyByZXNwb25zZS5kYXRhLm1lc3NhZ2UgOiAnQ291bGQgbm90IHVubGluayAnICsgcHJvdmlkZXIgKyAnIGFjY291bnQnKTtcblx0XHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdGFjY291bnQuZ2V0UHJvZmlsZSgpO1xuXHR9XG59KSgpOyIsIi8vIEV2ZW50IGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnRXZlbnQnLCBFdmVudCk7XG5cblx0RXZlbnQuJGluamVjdCA9IFsnVXRpbHMnLCAnJGZpbHRlciddO1xuXG5cdGZ1bmN0aW9uIEV2ZW50KFV0aWxzLCAkZmlsdGVyKSB7XG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgYSBwcmV0dHkgZGF0ZSBmb3IgVUkgZGlzcGxheSBmcm9tIHRoZSBzdGFydCBhbmQgZW5kIGRhdGV0aW1lc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50T2JqIHtvYmplY3R9IHRoZSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSBwcmV0dHkgc3RhcnQgYW5kIGVuZCBkYXRlIC8gdGltZSBzdHJpbmdcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRQcmV0dHlEYXRldGltZShldmVudE9iaikge1xuXHRcdFx0dmFyIHN0YXJ0RGF0ZSA9IGV2ZW50T2JqLnN0YXJ0RGF0ZSxcblx0XHRcdFx0c3RhcnREID0gbmV3IERhdGUoc3RhcnREYXRlKSxcblx0XHRcdFx0c3RhcnRUaW1lID0gZXZlbnRPYmouc3RhcnRUaW1lLFxuXHRcdFx0XHRlbmREYXRlID0gZXZlbnRPYmouZW5kRGF0ZSxcblx0XHRcdFx0ZW5kRCA9IG5ldyBEYXRlKGVuZERhdGUpLFxuXHRcdFx0XHRlbmRUaW1lID0gZXZlbnRPYmouZW5kVGltZSxcblx0XHRcdFx0ZGF0ZUZvcm1hdFN0ciA9ICdNTU0gZCB5eXl5Jyxcblx0XHRcdFx0cHJldHR5U3RhcnREYXRlID0gJGZpbHRlcignZGF0ZScpKHN0YXJ0RCwgZGF0ZUZvcm1hdFN0ciksXG5cdFx0XHRcdHByZXR0eUVuZERhdGUgPSAkZmlsdGVyKCdkYXRlJykoZW5kRCwgZGF0ZUZvcm1hdFN0ciksXG5cdFx0XHRcdHByZXR0eURhdGV0aW1lO1xuXG5cdFx0XHRpZiAocHJldHR5U3RhcnREYXRlID09PSBwcmV0dHlFbmREYXRlKSB7XG5cdFx0XHRcdC8vIGV2ZW50IHN0YXJ0cyBhbmQgZW5kcyBvbiB0aGUgc2FtZSBkYXlcblx0XHRcdFx0Ly8gQXByIDI5IDIwMTUsIDEyOjAwIFBNIC0gNTowMCBQTVxuXHRcdFx0XHRwcmV0dHlEYXRldGltZSA9IHByZXR0eVN0YXJ0RGF0ZSArICcsICcgKyBzdGFydFRpbWUgKyAnIC0gJyArIGVuZFRpbWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBldmVudCBzdGFydHMgYW5kIGVuZHMgb24gZGlmZmVyZW50IGRheXNcblx0XHRcdFx0Ly8gRGVjIDMxIDIwMTQsIDg6MDAgUE0gLSBKYW4gMSAyMDE1LCAxMTowMCBBTVxuXHRcdFx0XHRwcmV0dHlEYXRldGltZSA9IHByZXR0eVN0YXJ0RGF0ZSArICcsICcgKyBzdGFydFRpbWUgKyAnIC0gJyArIHByZXR0eUVuZERhdGUgKyAnLCAnICsgZW5kVGltZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHByZXR0eURhdGV0aW1lO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEdldCBKYXZhU2NyaXB0IERhdGUgZnJvbSBldmVudCBkYXRlIGFuZCB0aW1lIHN0cmluZ3Ncblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRlU3RyIHtzdHJpbmd9IG1tL2RkL3l5eVxuXHRcdCAqIEBwYXJhbSB0aW1lU3RyIHtzdHJpbmd9IGhoOm1tIEFNL1BNXG5cdFx0ICogQHJldHVybnMge0RhdGV9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0SlNEYXRldGltZShkYXRlU3RyLCB0aW1lU3RyKSB7XG5cdFx0XHR2YXIgZCA9IG5ldyBEYXRlKGRhdGVTdHIpLFxuXHRcdFx0XHR0aW1lQXJyID0gdGltZVN0ci5zcGxpdCgnICcpLFxuXHRcdFx0XHR0aW1lID0gdGltZUFyclswXS5zcGxpdCgnOicpLFxuXHRcdFx0XHRob3VycyA9IHRpbWVbMF0gKiAxLFxuXHRcdFx0XHRtaW51dGVzID0gdGltZVsxXSAqIDEsXG5cdFx0XHRcdGFtcG0gPSB0aW1lQXJyWzFdLFxuXHRcdFx0XHRmdWxsZGF0ZTtcblxuXHRcdFx0aWYgKGFtcG0gPT0gJ1BNJykge1xuXHRcdFx0XHRpZiAoaG91cnMgIT09IDEyKSB7XG5cdFx0XHRcdFx0aG91cnMgPSBob3VycyArIDEyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZ1bGxkYXRlID0gbmV3IERhdGUoZC5nZXRGdWxsWWVhcigpLCBkLmdldE1vbnRoKCksIGQuZ2V0RGF0ZSgpLCBob3VycywgbWludXRlcyk7XG5cblx0XHRcdHJldHVybiBmdWxsZGF0ZTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZXRlcm1pbmUgaWYgZXZlbnQgaXMgZXhwaXJlZFxuXHRcdCAqIChlbmQgZGF0ZS90aW1lIGhhcyBwYXNzZWQgY3VycmVudCBkYXRlL3RpbWUpXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZ0IHtvYmplY3R9IGV2ZW50IG9iamVjdFxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGV4cGlyZWQoZXZ0KSB7XG5cdFx0XHR2YXIganNTdGFydERhdGUgPSBnZXRKU0RhdGV0aW1lKGV2dC5lbmREYXRlLCBldnQuZW5kVGltZSksXG5cdFx0XHRcdG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHRcdHJldHVybiBqc1N0YXJ0RGF0ZSA8IG5vdztcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0UHJldHR5RGF0ZXRpbWU6IGdldFByZXR0eURhdGV0aW1lLFxuXHRcdFx0Z2V0SlNEYXRldGltZTogZ2V0SlNEYXRldGltZSxcblx0XHRcdGV4cGlyZWQ6IGV4cGlyZWRcblx0XHR9O1xuXHR9XG59KSgpOyIsIi8vIG1lZGlhIHF1ZXJ5IGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ01RJywge1xuXHRcdFx0U01BTEw6ICcobWF4LXdpZHRoOiA3NjdweCknLFxuXHRcdFx0TEFSR0U6ICcobWluLXdpZHRoOiA3NjhweCknXG5cdFx0fSk7XG59KSgpOyIsIi8vIGxvZ2luL09hdXRoIGNvbnN0YW50c1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29uc3RhbnQoJ09BVVRIJywge1xuXHRcdFx0TE9HSU5TOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ29vZ2xlJyxcblx0XHRcdFx0XHRuYW1lOiAnR29vZ2xlJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSdcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGFjY291bnQ6ICd0d2l0dGVyJyxcblx0XHRcdFx0XHRuYW1lOiAnVHdpdHRlcicsXG5cdFx0XHRcdFx0dXJsOiAnaHR0cDovL3R3aXR0ZXIuY29tJ1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0YWNjb3VudDogJ2ZhY2Vib29rJyxcblx0XHRcdFx0XHRuYW1lOiAnRmFjZWJvb2snLFxuXHRcdFx0XHRcdHVybDogJ2h0dHA6Ly9mYWNlYm9vay5jb20nXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRhY2NvdW50OiAnZ2l0aHViJyxcblx0XHRcdFx0XHRuYW1lOiAnR2l0SHViJyxcblx0XHRcdFx0XHR1cmw6ICdodHRwOi8vZ2l0aHViLmNvbSdcblx0XHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0pO1xufSkoKTsiLCIvLyBVc2VyIGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnVXNlcicsIFVzZXIpO1xuXG5cdFVzZXIuJGluamVjdCA9IFsnT0FVVEgnXTtcblxuXHRmdW5jdGlvbiBVc2VyKE9BVVRIKSB7XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYXJyYXkgb2YgYSB1c2VyJ3MgY3VycmVudGx5LWxpbmtlZCBhY2NvdW50IGxvZ2luc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHVzZXJPYmpcblx0XHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0TGlua2VkQWNjb3VudHModXNlck9iaikge1xuXHRcdFx0dmFyIGxpbmtlZEFjY291bnRzID0gW107XG5cblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChPQVVUSC5MT0dJTlMsIGZ1bmN0aW9uKGFjdE9iaikge1xuXHRcdFx0XHR2YXIgYWN0ID0gYWN0T2JqLmFjY291bnQ7XG5cblx0XHRcdFx0aWYgKHVzZXJPYmpbYWN0XSkge1xuXHRcdFx0XHRcdGxpbmtlZEFjY291bnRzLnB1c2goYWN0KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBsaW5rZWRBY2NvdW50cztcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0TGlua2VkQWNjb3VudHM6IGdldExpbmtlZEFjY291bnRzXG5cdFx0fTtcblx0fVxufSkoKTsiLCIvLyBVdGlsaXR5IGZ1bmN0aW9uc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZmFjdG9yeSgnVXRpbHMnLCBVdGlscyk7XG5cblx0ZnVuY3Rpb24gVXRpbHMoKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IG9yZGluYWwgdmFsdWVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBuIHtudW1iZXJ9IGlmIGEgc3RyaW5nIGlzIHByb3ZpZGVkLCAlIHdpbGwgYXR0ZW1wdCB0byBjb252ZXJ0IHRvIG51bWJlclxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IHRoLCBzdCwgbmQsIHJkXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0T3JkaW5hbChuKSB7XG5cdFx0XHR2YXIgb3JkQXJyID0gWyd0aCcsICdzdCcsICduZCcsICdyZCddLFxuXHRcdFx0XHRtb2R1bHVzID0gbiAlIDEwMDtcblxuXHRcdFx0cmV0dXJuIG9yZEFyclsobW9kdWx1cyAtIDIwKSAlIDEwXSB8fCBvcmRBcnJbbW9kdWx1c10gfHwgb3JkQXJyWzBdO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRPcmRpbmFsOiBnZXRPcmRpbmFsXG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb25maWcoYXV0aENvbmZpZylcblx0XHQucnVuKGF1dGhSdW4pO1xuXG5cdGF1dGhDb25maWcuJGluamVjdCA9IFsnJGF1dGhQcm92aWRlciddO1xuXG5cdGZ1bmN0aW9uIGF1dGhDb25maWcoJGF1dGhQcm92aWRlcikge1xuXHRcdC8vJGF1dGhQcm92aWRlci5sb2dpblVybCA9ICdodHRwOi8vcnN2cC5rbWFpZGEuaW8vYXV0aC9sb2dpbic7XG5cdFx0JGF1dGhQcm92aWRlci5sb2dpblVybCA9ICdodHRwOi8vbG9jYWxob3N0OjgwODAvbG9naW4nO1xuXG5cdFx0JGF1dGhQcm92aWRlci5mYWNlYm9vayh7XG5cdFx0XHRjbGllbnRJZDogJzQ3MTgzNzU5OTYzMDM3MSdcblx0XHR9KTtcblxuXHRcdCRhdXRoUHJvdmlkZXIuZ29vZ2xlKHtcblx0XHRcdGNsaWVudElkOiAnMTAzNTQ3ODgxNDA0Ny00MW44djJ1bWdzdXBrbnZtajdxMGU2bjFncjRuYXVhdi5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSdcblx0XHR9KTtcblxuXHRcdCRhdXRoUHJvdmlkZXIudHdpdHRlcih7XG5cdFx0XHR1cmw6ICcvYXV0aC90d2l0dGVyJ1xuXHRcdH0pO1xuXG5cdFx0JGF1dGhQcm92aWRlci5naXRodWIoe1xuXHRcdFx0Y2xpZW50SWQ6ICdiMzAzZmY0YjIxNmMwNTcxZjZjZSdcblx0XHR9KTtcblx0fVxuXG5cdGF1dGhSdW4uJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnJGF1dGgnXTtcblxuXHRmdW5jdGlvbiBhdXRoUnVuKCRyb290U2NvcGUsICRsb2NhdGlvbiwgJGF1dGgpIHtcblx0XHQkcm9vdFNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCkge1xuXHRcdFx0aWYgKG5leHQgJiYgbmV4dC4kJHJvdXRlICYmIG5leHQuJCRyb3V0ZS5zZWN1cmUgJiYgISRhdXRoLmlzQXV0aGVudGljYXRlZCgpKSB7XG5cdFx0XHRcdCRyb290U2NvcGUuYXV0aFBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuXG5cdFx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBzZW5kIHVzZXIgdG8gbG9naW5cblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cbn0pKCk7IiwiLy8gcm91dGVzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5jb25maWcoYXBwQ29uZmlnKTtcblxuXHRhcHBDb25maWcuJGluamVjdCA9IFsnJHJvdXRlUHJvdmlkZXInLCAnJGxvY2F0aW9uUHJvdmlkZXInXTtcblxuXHRmdW5jdGlvbiBhcHBDb25maWcoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cdFx0JHJvdXRlUHJvdmlkZXJcblx0XHRcdC53aGVuKCcvJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9ldmVudHMvRXZlbnRzLnZpZXcuaHRtbCcsXG5cdFx0XHRcdHNlY3VyZTogdHJ1ZVxuXHRcdFx0fSlcblx0XHRcdC53aGVuKCcvbG9naW4nLCB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnbmctYXBwL2xvZ2luL0xvZ2luLnZpZXcuaHRtbCdcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2V2ZW50LzpldmVudElkJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9ldmVudC1kZXRhaWwvRXZlbnREZXRhaWwudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9ldmVudC86ZXZlbnRJZC9lZGl0Jywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hZG1pbi9FZGl0RXZlbnQudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LndoZW4oJy9hY2NvdW50Jywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hY2NvdW50L0FjY291bnQudmlldy5odG1sJyxcblx0XHRcdFx0c2VjdXJlOiB0cnVlLFxuXHRcdFx0XHRyZWxvYWRPblNlYXJjaDogZmFsc2Vcblx0XHRcdH0pXG5cdFx0XHQud2hlbignL2FkbWluJywge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ25nLWFwcC9hZG1pbi9BZG1pbi52aWV3Lmh0bWwnLFxuXHRcdFx0XHRzZWN1cmU6IHRydWUsXG5cdFx0XHRcdHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuXHRcdFx0fSlcblx0XHRcdC5vdGhlcndpc2Uoe1xuXHRcdFx0XHRyZWRpcmVjdFRvOiAnLydcblx0XHRcdH0pO1xuXG5cdFx0JGxvY2F0aW9uUHJvdmlkZXJcblx0XHRcdC5odG1sNU1vZGUoe1xuXHRcdFx0XHRlbmFibGVkOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0Lmhhc2hQcmVmaXgoJyEnKTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdkZXRlY3RBZGJsb2NrJywgZGV0ZWN0QWRibG9jayk7XG5cblx0ZGV0ZWN0QWRibG9jay4kaW5qZWN0ID0gWyckdGltZW91dCcsICckbG9jYXRpb24nXTtcblxuXHRmdW5jdGlvbiBkZXRlY3RBZGJsb2NrKCR0aW1lb3V0LCAkbG9jYXRpb24pIHtcblxuXHRcdGRldGVjdEFkYmxvY2tMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbScsICckYXR0cnMnXTtcblxuXHRcdGZ1bmN0aW9uIGRldGVjdEFkYmxvY2tMaW5rKCRzY29wZSwgJGVsZW0sICRhdHRycykge1xuXHRcdFx0Ly8gZGF0YSBvYmplY3Rcblx0XHRcdCRzY29wZS5hYiA9IHt9O1xuXG5cdFx0XHQvLyBob3N0bmFtZSBmb3IgbWVzc2FnaW5nXG5cdFx0XHQkc2NvcGUuYWIuaG9zdCA9ICRsb2NhdGlvbi5ob3N0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2hlY2sgaWYgYWRzIGFyZSBibG9ja2VkIC0gY2FsbGVkIGluICR0aW1lb3V0IHRvIGxldCBBZEJsb2NrZXJzIHJ1blxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9hcmVBZHNCbG9ja2VkKCkge1xuXHRcdFx0XHR2YXIgX2EgPSAkZWxlbS5maW5kKCcuYWQtdGVzdCcpO1xuXG5cdFx0XHRcdCRzY29wZS5hYi5ibG9ja2VkID0gX2EuaGVpZ2h0KCkgPD0gMCB8fCAhJGVsZW0uZmluZCgnLmFkLXRlc3Q6dmlzaWJsZScpLmxlbmd0aDtcblx0XHRcdH1cblxuXHRcdFx0JHRpbWVvdXQoX2FyZUFkc0Jsb2NrZWQsIDIwMCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogZGV0ZWN0QWRibG9ja0xpbmssXG5cdFx0XHR0ZW1wbGF0ZTogICAnPGRpdiBjbGFzcz1cImFkLXRlc3QgZmEtZmFjZWJvb2sgZmEtdHdpdHRlclwiIHN0eWxlPVwiaGVpZ2h0OjFweDtcIj48L2Rpdj4nICtcblx0XHRcdFx0XHRcdCc8ZGl2IG5nLWlmPVwiYWIuYmxvY2tlZFwiIGNsYXNzPVwiYWItbWVzc2FnZSBhbGVydCBhbGVydC1kYW5nZXJcIj4nICtcblx0XHRcdFx0XHRcdFx0JzxpIGNsYXNzPVwiZmEgZmEtYmFuXCI+PC9pPiA8c3Ryb25nPkFkQmxvY2s8L3N0cm9uZz4gaXMgcHJvaGliaXRpbmcgaW1wb3J0YW50IGZ1bmN0aW9uYWxpdHkhIFBsZWFzZSBkaXNhYmxlIGFkIGJsb2NraW5nIG9uIDxzdHJvbmc+e3thYi5ob3N0fX08L3N0cm9uZz4uIFRoaXMgc2l0ZSBpcyBhZC1mcmVlLicgK1xuXHRcdFx0XHRcdFx0JzwvZGl2Pidcblx0XHR9XG5cdH1cblxufSkoKTsiLCIvLyBVc2VyIEFQSSAkaHR0cCBjYWxsc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuc2VydmljZSgnZXZlbnREYXRhJywgZXZlbnREYXRhKTtcblxuXHQvKipcblx0ICogR0VUIHByb21pc2UgcmVzcG9uc2UgZnVuY3Rpb25cblx0ICogQ2hlY2tzIHR5cGVvZiBkYXRhIHJldHVybmVkIGFuZCBzdWNjZWVkcyBpZiBKUyBvYmplY3QsIHRocm93cyBlcnJvciBpZiBub3Rcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlIHsqfSBkYXRhIGZyb20gJGh0dHBcblx0ICogQHJldHVybnMgeyp9IG9iamVjdCwgYXJyYXlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIF9nZXRSZXMocmVzcG9uc2UpIHtcblx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdyZXRyaWV2ZWQgZGF0YSBpcyBub3QgdHlwZW9mIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRldmVudERhdGEuJGluamVjdCA9IFsnJGh0dHAnXTtcblxuXHRmdW5jdGlvbiBldmVudERhdGEoJGh0dHApIHtcblx0XHQvKipcblx0XHQgKiBHZXQgZXZlbnQgYnkgSURcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpZCB7c3RyaW5nfSBldmVudCBNb25nb0RCIF9pZFxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0RXZlbnQgPSBmdW5jdGlvbihpZCkge1xuXHRcdFx0cmV0dXJuICRodHRwKHtcblx0XHRcdFx0bWV0aG9kOiAnR0VUJyxcblx0XHRcdFx0dXJsOiAnL2FwaS9ldmVudC8nICsgaWRcblx0XHRcdH0pLnRoZW4oX2dldFJlcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCBhbGwgZXZlbnRzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEFsbEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9hcGkvZXZlbnRzJylcblx0XHRcdFx0LnRoZW4oX2dldFJlcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZSBhIG5ldyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50RGF0YSB7b2JqZWN0fSBuZXcgZXZlbnQgZGF0YVxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuY3JlYXRlRXZlbnQgPSBmdW5jdGlvbihldmVudERhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucG9zdCgnL2FwaS9ldmVudC9uZXcnLCBldmVudERhdGEpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGUgYW4gZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudERhdGEge29iamVjdH0gdXBkYXRlZCBldmVudCBkYXRhXG5cdFx0ICogQHBhcmFtIGlkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy51cGRhdGVFdmVudCA9IGZ1bmN0aW9uKGlkLCBldmVudERhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucHV0KCcvYXBpL2V2ZW50LycgKyBpZCwgZXZlbnREYXRhKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlIGFuIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gaWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmRlbGV0ZUV2ZW50ID0gZnVuY3Rpb24oaWQpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQuZGVsZXRlKCcvYXBpL2V2ZW50LycgKyBpZCk7XG5cdFx0fVxuXHR9XG59KSgpOyIsIi8vIEZldGNoIGxvY2FsIEpTT04gZGF0YVxuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuc2VydmljZSgnbG9jYWxEYXRhJywgbG9jYWxEYXRhKTtcblxuXHQvKipcblx0ICogR0VUIHByb21pc2UgcmVzcG9uc2UgZnVuY3Rpb25cblx0ICogQ2hlY2tzIHR5cGVvZiBkYXRhIHJldHVybmVkIGFuZCBzdWNjZWVkcyBpZiBKUyBvYmplY3QsIHRocm93cyBlcnJvciBpZiBub3Rcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlIHsqfSBkYXRhIGZyb20gJGh0dHBcblx0ICogQHJldHVybnMgeyp9IG9iamVjdCwgYXJyYXlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIF9nZXRSZXMocmVzcG9uc2UpIHtcblx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdyZXRyaWV2ZWQgZGF0YSBpcyBub3QgdHlwZW9mIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRsb2NhbERhdGEuJGluamVjdCA9IFsnJGh0dHAnXTtcblxuXHRmdW5jdGlvbiBsb2NhbERhdGEoJGh0dHApIHtcblx0XHQvKipcblx0XHQgKiBHZXQgbG9jYWwgSlNPTiBkYXRhIGZpbGUgYW5kIHJldHVybiByZXN1bHRzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEpTT04gPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQuZ2V0KCcvbmctYXBwL2RhdGEvZGF0YS5qc29uJylcblx0XHRcdFx0LnRoZW4oX2dldFJlcyk7XG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBhbmd1bGFyTWVkaWFDaGVjayA9IGFuZ3VsYXIubW9kdWxlKCdtZWRpYUNoZWNrJywgW10pO1xuXG5cdGFuZ3VsYXJNZWRpYUNoZWNrLnNlcnZpY2UoJ21lZGlhQ2hlY2snLCBbJyR3aW5kb3cnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJHdpbmRvdywgJHRpbWVvdXQpIHtcblx0XHR0aGlzLmluaXQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdFx0dmFyICRzY29wZSA9IG9wdGlvbnNbJ3Njb3BlJ10sXG5cdFx0XHRcdHF1ZXJ5ID0gb3B0aW9uc1snbXEnXSxcblx0XHRcdFx0ZGVib3VuY2UgPSBvcHRpb25zWydkZWJvdW5jZSddLFxuXHRcdFx0XHQkd2luID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLFxuXHRcdFx0XHRicmVha3BvaW50cyxcblx0XHRcdFx0Y3JlYXRlTGlzdGVuZXIgPSB2b2lkIDAsXG5cdFx0XHRcdGhhc01hdGNoTWVkaWEgPSAkd2luZG93Lm1hdGNoTWVkaWEgIT09IHVuZGVmaW5lZCAmJiAhISR3aW5kb3cubWF0Y2hNZWRpYSgnIScpLmFkZExpc3RlbmVyLFxuXHRcdFx0XHRtcUxpc3RMaXN0ZW5lcixcblx0XHRcdFx0bW1MaXN0ZW5lcixcblx0XHRcdFx0ZGVib3VuY2VSZXNpemUsXG5cdFx0XHRcdG1xID0gdm9pZCAwLFxuXHRcdFx0XHRtcUNoYW5nZSA9IHZvaWQgMCxcblx0XHRcdFx0ZGVib3VuY2VTcGVlZCA9ICEhZGVib3VuY2UgPyBkZWJvdW5jZSA6IDI1MDtcblxuXHRcdFx0aWYgKGhhc01hdGNoTWVkaWEpIHtcblx0XHRcdFx0bXFDaGFuZ2UgPSBmdW5jdGlvbiAobXEpIHtcblx0XHRcdFx0XHRpZiAobXEubWF0Y2hlcyAmJiB0eXBlb2Ygb3B0aW9ucy5lbnRlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5lbnRlcihtcSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5leGl0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuZXhpdChtcSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5jaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdG9wdGlvbnMuY2hhbmdlKG1xKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y3JlYXRlTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0bXEgPSAkd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpO1xuXHRcdFx0XHRcdG1xTGlzdExpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1xQ2hhbmdlKG1xKVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRtcS5hZGRMaXN0ZW5lcihtcUxpc3RMaXN0ZW5lcik7XG5cblx0XHRcdFx0XHQvLyBiaW5kIHRvIHRoZSBvcmllbnRhdGlvbmNoYW5nZSBldmVudCBhbmQgZmlyZSBtcUNoYW5nZVxuXHRcdFx0XHRcdCR3aW4uYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBtcUxpc3RMaXN0ZW5lcik7XG5cblx0XHRcdFx0XHQvLyBjbGVhbnVwIGxpc3RlbmVycyB3aGVuICRzY29wZSBpcyAkZGVzdHJveWVkXG5cdFx0XHRcdFx0JHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRtcS5yZW1vdmVMaXN0ZW5lcihtcUxpc3RMaXN0ZW5lcik7XG5cdFx0XHRcdFx0XHQkd2luLnVuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBtcUxpc3RMaXN0ZW5lcik7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gbXFDaGFuZ2UobXEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHJldHVybiBjcmVhdGVMaXN0ZW5lcigpO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRicmVha3BvaW50cyA9IHt9O1xuXG5cdFx0XHRcdG1xQ2hhbmdlID0gZnVuY3Rpb24gKG1xKSB7XG5cdFx0XHRcdFx0aWYgKG1xLm1hdGNoZXMpIHtcblx0XHRcdFx0XHRcdGlmICghIWJyZWFrcG9pbnRzW3F1ZXJ5XSA9PT0gZmFsc2UgJiYgKHR5cGVvZiBvcHRpb25zLmVudGVyID09PSAnZnVuY3Rpb24nKSkge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmVudGVyKG1xKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PT0gdHJ1ZSB8fCBicmVha3BvaW50c1txdWVyeV0gPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuZXhpdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuZXhpdChtcSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoKG1xLm1hdGNoZXMgJiYgKCFicmVha3BvaW50c1txdWVyeV0pIHx8ICghbXEubWF0Y2hlcyAmJiAoYnJlYWtwb2ludHNbcXVlcnldID09PSB0cnVlIHx8IGJyZWFrcG9pbnRzW3F1ZXJ5XSA9PSBudWxsKSkpKSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuY2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuY2hhbmdlKG1xKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gYnJlYWtwb2ludHNbcXVlcnldID0gbXEubWF0Y2hlcztcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgY29udmVydEVtVG9QeCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHRcdHZhciBlbUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuXHRcdFx0XHRcdGVtRWxlbWVudC5zdHlsZS53aWR0aCA9ICcxZW0nO1xuXHRcdFx0XHRcdGVtRWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbUVsZW1lbnQpO1xuXHRcdFx0XHRcdHB4ID0gdmFsdWUgKiBlbUVsZW1lbnQub2Zmc2V0V2lkdGg7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbUVsZW1lbnQpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHB4O1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBnZXRQWFZhbHVlID0gZnVuY3Rpb24gKHdpZHRoLCB1bml0KSB7XG5cdFx0XHRcdFx0dmFyIHZhbHVlO1xuXHRcdFx0XHRcdHZhbHVlID0gdm9pZCAwO1xuXHRcdFx0XHRcdHN3aXRjaCAodW5pdCkge1xuXHRcdFx0XHRcdFx0Y2FzZSAnZW0nOlxuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9IGNvbnZlcnRFbVRvUHgod2lkdGgpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdHZhbHVlID0gd2lkdGg7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRicmVha3BvaW50c1txdWVyeV0gPSBudWxsO1xuXG5cdFx0XHRcdG1tTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIHBhcnRzID0gcXVlcnkubWF0Y2goL1xcKCguKiktLio6XFxzKihbXFxkXFwuXSopKC4qKVxcKS8pLFxuXHRcdFx0XHRcdFx0Y29uc3RyYWludCA9IHBhcnRzWzFdLFxuXHRcdFx0XHRcdFx0dmFsdWUgPSBnZXRQWFZhbHVlKHBhcnNlSW50KHBhcnRzWzJdLCAxMCksIHBhcnRzWzNdKSxcblx0XHRcdFx0XHRcdGZha2VNYXRjaE1lZGlhID0ge30sXG5cdFx0XHRcdFx0XHR3aW5kb3dXaWR0aCA9ICR3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGg7XG5cblx0XHRcdFx0XHRmYWtlTWF0Y2hNZWRpYS5tYXRjaGVzID0gY29uc3RyYWludCA9PT0gJ21heCcgJiYgdmFsdWUgPiB3aW5kb3dXaWR0aCB8fCBjb25zdHJhaW50ID09PSAnbWluJyAmJiB2YWx1ZSA8IHdpbmRvd1dpZHRoO1xuXG5cdFx0XHRcdFx0cmV0dXJuIG1xQ2hhbmdlKGZha2VNYXRjaE1lZGlhKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgZmFrZU1hdGNoTWVkaWFSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGRlYm91bmNlUmVzaXplKTtcblx0XHRcdFx0XHRkZWJvdW5jZVJlc2l6ZSA9ICR0aW1lb3V0KG1tTGlzdGVuZXIsIGRlYm91bmNlU3BlZWQpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCR3aW4uYmluZCgncmVzaXplJywgZmFrZU1hdGNoTWVkaWFSZXNpemUpO1xuXG5cdFx0XHRcdCRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCR3aW4udW5iaW5kKCdyZXNpemUnLCBmYWtlTWF0Y2hNZWRpYVJlc2l6ZSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBtbUxpc3RlbmVyKCk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fV0pO1xufSkoKTsiLCIvLyBVc2VyIEFQSSAkaHR0cCBjYWxsc1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuc2VydmljZSgncnN2cERhdGEnLCByc3ZwRGF0YSk7XG5cblx0LyoqXG5cdCAqIEdFVCBwcm9taXNlIHJlc3BvbnNlIGZ1bmN0aW9uXG5cdCAqIENoZWNrcyB0eXBlb2YgZGF0YSByZXR1cm5lZCBhbmQgc3VjY2VlZHMgaWYgSlMgb2JqZWN0LCB0aHJvd3MgZXJyb3IgaWYgbm90XG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSB7Kn0gZGF0YSBmcm9tICRodHRwXG5cdCAqIEByZXR1cm5zIHsqfSBvYmplY3QsIGFycmF5XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBfZ2V0UmVzKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcigncmV0cmlldmVkIGRhdGEgaXMgbm90IHR5cGVvZiBvYmplY3QuJyk7XG5cdFx0fVxuXHR9XG5cblx0cnN2cERhdGEuJGluamVjdCA9IFsnJGh0dHAnXTtcblxuXHRmdW5jdGlvbiByc3ZwRGF0YSgkaHR0cCkge1xuXHRcdC8qKlxuXHRcdCAqIEdldCBhbGwgUlNWUGVkIGd1ZXN0cyBmb3IgYSBzcGVjaWZpYyBldmVudCBieSBldmVudCBJRFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2ZW50SWQge3N0cmluZ30gZXZlbnQgTW9uZ29EQiBfaWRcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEV2ZW50R3Vlc3RzID0gZnVuY3Rpb24oZXZlbnRJZCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9hcGkvcnN2cHMvZXZlbnQvJyArIGV2ZW50SWQpXG5cdFx0XHRcdC50aGVuKF9nZXRSZXMpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYSBuZXcgUlNWUCBmb3IgYW4gZXZlbnRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldmVudElkIHtzdHJpbmd9IGV2ZW50IE1vbmdvREIgX2lkXG5cdFx0ICogQHBhcmFtIHJzdnBEYXRhIHtvYmplY3R9IG5ldyBSU1ZQIGRhdGFcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZVJzdnAgPSBmdW5jdGlvbihldmVudElkLCByc3ZwRGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5wb3N0KCcvYXBpL3JzdnAvZXZlbnQvJyArIGV2ZW50SWQsIHJzdnBEYXRhKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIGFuIFJTVlAgYnkgc3BlY2lmaWMgUlNWUCBJRFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHJzdnBJZCB7c3RyaW5nfSBSU1ZQIE1vbmdvREIgX2lkXG5cdFx0ICogQHBhcmFtIHJzdnBEYXRhIHtvYmplY3R9IHVwZGF0ZWQgUlNWUCBkYXRhXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy51cGRhdGVSc3ZwID0gZnVuY3Rpb24ocnN2cElkLCByc3ZwRGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5wdXQoJy9hcGkvcnN2cC8nICsgcnN2cElkLCByc3ZwRGF0YSk7XG5cdFx0fTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5maWx0ZXIoJ3RydXN0QXNIVE1MJywgdHJ1c3RBc0hUTUwpO1xuXG5cdHRydXN0QXNIVE1MLiRpbmplY3QgPSBbJyRzY2UnXTtcblxuXHRmdW5jdGlvbiB0cnVzdEFzSFRNTCgkc2NlKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uICh0ZXh0KSB7XG5cdFx0XHRyZXR1cm4gJHNjZS50cnVzdEFzSHRtbCh0ZXh0KTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIi8vIFVzZXIgZGlyZWN0aXZlXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3VzZXInLCB1c2VyKTtcblxuXHR1c2VyLiRpbmplY3QgPSBbJ3VzZXJEYXRhJywgJyRhdXRoJ107XG5cblx0ZnVuY3Rpb24gdXNlcih1c2VyRGF0YSwgJGF1dGgpIHtcblxuXHRcdC8qKlxuXHRcdCAqIFVzZXIgZGlyZWN0aXZlIGNvbnRyb2xsZXJcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1c2VyQ3RybCgpIHtcblx0XHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHRcdHZhciB1ID0gdGhpcztcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayBpZiB0aGUgY3VycmVudCB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHRcdCAqL1xuXHRcdFx0dS5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICRhdXRoLmlzQXV0aGVudGljYXRlZCgpO1xuXHRcdFx0fTtcblxuXHRcdFx0Ly8gQVBJIHJlcXVlc3QgdG8gZ2V0IHRoZSB1c2VyLCBwYXNzaW5nIHN1Y2Nlc3MgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBzZXRzIHRoZSB1c2VyJ3MgaW5mb1xuXHRcdFx0dXNlckRhdGEuZ2V0VXNlcigpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHR1LnVzZXIgPSBkYXRhO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0Y29udHJvbGxlcjogdXNlckN0cmwsXG5cdFx0XHRjb250cm9sbGVyQXM6ICd1Jyxcblx0XHRcdHRlbXBsYXRlOiAnPGRpdiBuZy1pZj1cInUuaXNBdXRoZW50aWNhdGVkKCkgJiYgISF1LnVzZXJcIiBjbGFzcz1cInVzZXIgY2xlYXJmaXhcIj48aW1nIG5nLWlmPVwiISF1LnVzZXIucGljdHVyZVwiIG5nLXNyYz1cInt7dS51c2VyLnBpY3R1cmV9fVwiIGNsYXNzPVwidXNlci1waWN0dXJlXCIgLz48c3BhbiBjbGFzcz1cInVzZXItZGlzcGxheU5hbWVcIj57e3UudXNlci5kaXNwbGF5TmFtZX19PC9zcGFuPjwvZGl2Pidcblx0XHR9O1xuXHR9XG59KSgpOyIsIi8vIFVzZXIgQVBJICRodHRwIGNhbGxzXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5zZXJ2aWNlKCd1c2VyRGF0YScsIHVzZXJEYXRhKTtcblxuXHQvKipcblx0ICogR0VUIHByb21pc2UgcmVzcG9uc2UgZnVuY3Rpb25cblx0ICogQ2hlY2tzIHR5cGVvZiBkYXRhIHJldHVybmVkIGFuZCBzdWNjZWVkcyBpZiBKUyBvYmplY3QsIHRocm93cyBlcnJvciBpZiBub3Rcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlIHsqfSBkYXRhIGZyb20gJGh0dHBcblx0ICogQHJldHVybnMgeyp9IG9iamVjdCwgYXJyYXlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIF9nZXRSZXMocmVzcG9uc2UpIHtcblx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdyZXRyaWV2ZWQgZGF0YSBpcyBub3QgdHlwZW9mIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHR1c2VyRGF0YS4kaW5qZWN0ID0gWyckaHR0cCddO1xuXG5cdGZ1bmN0aW9uIHVzZXJEYXRhKCRodHRwKSB7XG5cdFx0LyoqXG5cdFx0ICogR2V0IGN1cnJlbnQgdXNlcidzIGRhdGFcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtwcm9taXNlfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0VXNlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRodHRwXG5cdFx0XHRcdC5nZXQoJy9hcGkvbWUnKVxuXHRcdFx0XHQudGhlbihfZ2V0UmVzKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIGN1cnJlbnQgdXNlcidzIHByb2ZpbGUgZGF0YVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHByb2ZpbGVEYXRhIHtvYmplY3R9IHVwZGF0ZWQgcHJvZmlsZSBkYXRhXG5cdFx0ICogQHJldHVybnMge3Byb21pc2V9XG5cdFx0ICovXG5cdFx0dGhpcy51cGRhdGVVc2VyID0gZnVuY3Rpb24ocHJvZmlsZURhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cFxuXHRcdFx0XHQucHV0KCcvYXBpL21lJywgcHJvZmlsZURhdGEpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBHZXQgYWxsIHVzZXJzIChhZG1pbiBhdXRob3JpemVkIG9ubHkpXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7cHJvbWlzZX1cblx0XHQgKi9cblx0XHR0aGlzLmdldEFsbFVzZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHBcblx0XHRcdFx0LmdldCgnL2FwaS91c2VycycpXG5cdFx0XHRcdC50aGVuKF9nZXRSZXMpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiLy8gRm9yIGV2ZW50cyBiYXNlZCBvbiB2aWV3cG9ydCBzaXplIC0gdXBkYXRlcyBhcyB2aWV3cG9ydCBpcyByZXNpemVkXG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZpZXdTd2l0Y2gnLCB2aWV3U3dpdGNoKTtcblxuXHR2aWV3U3dpdGNoLiRpbmplY3QgPSBbJ21lZGlhQ2hlY2snLCAnTVEnLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiB2aWV3U3dpdGNoKG1lZGlhQ2hlY2ssIE1RLCAkdGltZW91dCkge1xuXG5cdFx0dmlld1N3aXRjaExpbmsuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHQvKipcblx0XHQgKiB2aWV3U3dpdGNoIGRpcmVjdGl2ZSBsaW5rIGZ1bmN0aW9uXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gJHNjb3BlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdmlld1N3aXRjaExpbmsoJHNjb3BlKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLnZzID0ge307XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBlbnRlciBtZWRpYSBxdWVyeVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9lbnRlckZuKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnZzLnZpZXdmb3JtYXQgPSAnc21hbGwnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGV4aXQgbWVkaWEgcXVlcnlcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXhpdEZuKCkge1xuXHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0JHNjb3BlLnZzLnZpZXdmb3JtYXQgPSAnbGFyZ2UnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBtZWRpYUNoZWNrXG5cdFx0XHRtZWRpYUNoZWNrLmluaXQoe1xuXHRcdFx0XHRzY29wZTogJHNjb3BlLFxuXHRcdFx0XHRtcTogTVEuU01BTEwsXG5cdFx0XHRcdGVudGVyOiBfZW50ZXJGbixcblx0XHRcdFx0ZXhpdDogX2V4aXRGblxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0bGluazogdmlld1N3aXRjaExpbmtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIEFkbWluQ3RybCk7XG5cblx0QWRtaW5DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nLCAnJGF1dGgnLCAndXNlckRhdGEnLCAnVXNlcicsICdyc3ZwRGF0YSddO1xuXG5cdGZ1bmN0aW9uIEFkbWluQ3RybCgkc2NvcGUsICRsb2NhdGlvbiwgJGF1dGgsIHVzZXJEYXRhLCBVc2VyLCByc3ZwRGF0YSkge1xuXHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHR2YXIgYWRtaW4gPSB0aGlzO1xuXG5cdFx0Ly8gdmVyaWZ5IHRoYXQgdXNlciBpcyBhZG1pblxuXHRcdHVzZXJEYXRhLmdldFVzZXIoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGFkbWluLmFkbWluUmVhZHkgPSB0cnVlO1xuXG5cdFx0XHRpZiAoZGF0YS5pc0FkbWluKSB7XG5cdFx0XHRcdGFkbWluLnNob3dBZG1pbiA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBEZXRlcm1pbmVzIGlmIHRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHRcdCAqL1xuXHRcdGFkbWluLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRhdXRoLmlzQXV0aGVudGljYXRlZCgpO1xuXHRcdH07XG5cblx0XHR2YXIgX3RhYiA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuXG5cdFx0YWRtaW4udGFicyA9IFtcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ0V2ZW50cycsXG5cdFx0XHRcdHF1ZXJ5OiAnZXZlbnRzJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ0FkZCBFdmVudCcsXG5cdFx0XHRcdHF1ZXJ5OiAnYWRkLWV2ZW50J1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogJ1VzZXJzJyxcblx0XHRcdFx0cXVlcnk6ICd1c2Vycydcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0YWRtaW4uY3VycmVudFRhYiA9IF90YWIgPyBfdGFiIDogJ2V2ZW50cyc7XG5cblx0XHQvKipcblx0XHQgKiBDaGFuZ2UgdGFicyBieSB3YXRjaGluZyBmb3Igcm91dGUgdXBkYXRlXG5cdFx0ICovXG5cdFx0JHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIG5leHQpIHtcblx0XHRcdGFkbWluLmN1cnJlbnRUYWIgPSBuZXh0LnBhcmFtcy52aWV3IHx8ICdldmVudHMnO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgZ2V0dGluZyB1c2VyIGxpc3Rcblx0XHQgKiBTaG93IEFkbWluIFVJXG5cdFx0ICogRGlzcGxheSBsaXN0IG9mIHVzZXJzXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7QXJyYXl9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2dldEFsbFVzZXJzU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRhZG1pbi51c2VycyA9IGRhdGE7XG5cblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChhZG1pbi51c2VycywgZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHR1c2VyLmxpbmtlZEFjY291bnRzID0gVXNlci5nZXRMaW5rZWRBY2NvdW50cyh1c2VyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHVzZXJEYXRhLmdldEFsbFVzZXJzKCkudGhlbihfZ2V0QWxsVXNlcnNTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIFNob3cgUlNWUGVkIGd1ZXN0IG1vZGFsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZXZlbnRJZCB7c3RyaW5nfSBldmVudCBJRCB0byBnZXQgUlNWUHMgZm9yXG5cdFx0ICogQHBhcmFtIGV2ZW50TmFtZSB7c3RyaW5nfSBldmVudCBuYW1lIHRvIGdldCBSU1ZQcyBmb3Jcblx0XHQgKi9cblx0XHRhZG1pbi5zaG93R3Vlc3RzID0gZnVuY3Rpb24oZXZlbnRJZCwgZXZlbnROYW1lKSB7XG5cdFx0XHRhZG1pbi5zaG93R3Vlc3RzRXZlbnRJZCA9IGV2ZW50SWQ7XG5cdFx0XHRhZG1pbi5zaG93R3Vlc3RzRXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdFx0YWRtaW4uc2hvd01vZGFsID0gdHJ1ZTtcblx0XHR9O1xuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0FkbWluRXZlbnRMaXN0Q3RybCcsIEFkbWluRXZlbnRMaXN0Q3RybCk7XG5cblx0QWRtaW5FdmVudExpc3RDdHJsLiRpbmplY3QgPSBbJ2V2ZW50RGF0YScsICckbG9jYXRpb24nLCAnJHRpbWVvdXQnLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBBZG1pbkV2ZW50TGlzdEN0cmwoZXZlbnREYXRhLCAkbG9jYXRpb24sICR0aW1lb3V0LCBFdmVudCkge1xuXHRcdC8vIGNvbnRyb2xsZXJBcyBWaWV3TW9kZWxcblx0XHR2YXIgYUV2dCA9IHRoaXM7XG5cblx0XHRhRXZ0LmV2dFVybCA9ICRsb2NhdGlvbi5wcm90b2NvbCgpICsgJzovLycgKyAkbG9jYXRpb24uaG9zdCgpICsgJy9ldmVudC8nO1xuXG5cdFx0LyoqXG5cdFx0ICogSGlkZSBVUkwgaW5wdXQgZmllbGQgd2hlbiBibHVycmVkXG5cdFx0ICovXG5cdFx0YUV2dC5ibHVyVXJsSW5wdXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFFdnQuY29weUlucHV0ID0gbnVsbDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU2hvdyBVUkwgaW5wdXQgZmllbGQgd2hlbiBJRCBsaW5rIGlzIGNsaWNrZWRcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBpbmRleFxuXHRcdCAqL1xuXHRcdGFFdnQuc2hvd1VybElucHV0ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGFFdnQuY29weUlucHV0ID0gaW5kZXg7XG5cblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoJyNlJyArIGluZGV4KS5maW5kKCdpbnB1dCcpLnNlbGVjdCgpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEZ1bmN0aW9uIGZvciBzdWNjZXNzZnVsIEFQSSBjYWxsIGdldHRpbmcgYWxsIGV2ZW50c1xuXHRcdCAqIFNob3cgQWRtaW4gRXZlbnRzIFVJXG5cdFx0ICogRGlzcGxheSBsaXN0IG9mIGV2ZW50c1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge0FycmF5fSBwcm9taXNlIHByb3ZpZGVkIGJ5ICRodHRwIHN1Y2Nlc3Ncblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9nZXRBbGxFdmVudHNTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGFFdnQuZXZlbnRzID0gZGF0YTtcblx0XHRcdGFFdnQuZXZlbnRzUmVhZHkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV2ZW50RGF0YS5nZXRBbGxFdmVudHMoKS50aGVuKF9nZXRBbGxFdmVudHNTdWNjZXNzKTtcblxuXHRcdC8qKlxuXHRcdCAqIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG5cdFx0ICogR2V0IGV2ZW50IHN0YXJ0IGRhdGUgYW5kIGNoYW5nZSB0byByZWFsIGRhdGUgdG8gc29ydCBieVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGV2dCB7b2JqZWN0fSBldmVudCBvYmplY3Rcblx0XHQgKiBAcmV0dXJucyB7RGF0ZX1cblx0XHQgKi9cblx0XHRhRXZ0LnNvcnRTdGFydERhdGUgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdHJldHVybiBFdmVudC5nZXRKU0RhdGV0aW1lKGV2dC5zdGFydERhdGUsIGV2dC5zdGFydFRpbWUpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignRWRpdEV2ZW50Q3RybCcsIEVkaXRFdmVudEN0cmwpO1xuXG5cdEVkaXRFdmVudEN0cmwuJGluamVjdCA9IFsnJGF1dGgnLCAndXNlckRhdGEnLCAnZXZlbnREYXRhJywgJyRyb3V0ZVBhcmFtcycsICckbG9jYXRpb24nLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiBFZGl0RXZlbnRDdHJsKCRhdXRoLCB1c2VyRGF0YSwgZXZlbnREYXRhLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHRpbWVvdXQpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGVkaXQgPSB0aGlzO1xuXG5cdFx0Ly8gZ2V0IHRoZSBldmVudCBJRFxuXHRcdHZhciBfZXZlbnRJZCA9ICRyb3V0ZVBhcmFtcy5ldmVudElkO1xuXG5cdFx0Ly8gdGFic1xuXHRcdGVkaXQudGFicyA9IFsnVXBkYXRlIERldGFpbHMnLCAnRGVsZXRlIEV2ZW50J107XG5cdFx0ZWRpdC5jdXJyZW50VGFiID0gMDtcblxuXHRcdGVkaXQuY2hhbmdlVGFiID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGVkaXQuY3VycmVudFRhYiA9IGluZGV4O1xuXHRcdH07XG5cblx0XHQvLyB2ZXJpZnkgdGhhdCB1c2VyIGlzIGFkbWluXG5cdFx0dXNlckRhdGEuZ2V0VXNlcigpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0ZWRpdC5zaG93RWRpdCA9IGRhdGEuaXNBZG1pbiA/IHRydWUgOiBmYWxzZTtcblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZXMgaWYgdGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZFxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZWRpdC5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkYXV0aC5pc0F1dGhlbnRpY2F0ZWQoKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogRnVuY3Rpb24gcmV0dXJuZWQgb24gc3VjY2Vzc2Z1bCBBUEkgY2FsbCBmb3IgdGhpcyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gZXZlbnQgZGF0YVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2dldEV2ZW50U3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRlZGl0LmVkaXRFdmVudCA9IGRhdGE7XG5cdFx0XHRlZGl0LnNob3dFZGl0Rm9ybSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZXZlbnREYXRhLmdldEV2ZW50KF9ldmVudElkKS50aGVuKF9nZXRFdmVudFN1Y2Nlc3MpO1xuXG5cdFx0LyoqXG5cdFx0ICogUmVzZXQgdGhlIGRlbGV0ZSBidXR0b24gdG8gZGVmYXVsdCBzdGF0ZVxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfYnRuRGVsZXRlUmVzZXQoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZSA9IGZhbHNlO1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0ZSBFdmVudCc7XG5cdFx0fVxuXG5cdFx0X2J0bkRlbGV0ZVJlc2V0KCk7XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiByZXR1cm5lZCBvbiBzdWNjZXNzZnVsIGRlbGV0aW9uIG9mIGV2ZW50XG5cdFx0ICpcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIF9kZWxldGVTdWNjZXNzKCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0ZWQhJztcblx0XHRcdGVkaXQuYnRuRGVsZXRlID0gdHJ1ZTtcblx0XHRcdGVkaXQuZWRpdEV2ZW50ID0ge307XG5cblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2FkbWluJyk7XG5cdFx0XHR9LCAxNTAwKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiByZXR1cm5lZCBvbiBlcnJvciBkZWxldGluZyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZGVsZXRlRXJyb3IoKSB7XG5cdFx0XHRlZGl0LmJ0bkRlbGV0ZVRleHQgPSAnRXJyb3IgZGVsZXRpbmchJztcblxuXHRcdFx0JHRpbWVvdXQoX2J0bkRlbGV0ZVJlc2V0LCAzMDAwKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBEZWxldGUgdGhlIGV2ZW50XG5cdFx0ICovXG5cdFx0ZWRpdC5kZWxldGVFdmVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZWRpdC5idG5EZWxldGVUZXh0ID0gJ0RlbGV0aW5nLi4uJztcblxuXHRcdFx0ZXZlbnREYXRhLmRlbGV0ZUV2ZW50KF9ldmVudElkKS50aGVuKF9kZWxldGVTdWNjZXNzLCBfZGVsZXRlRXJyb3IpO1xuXHRcdH07XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdldmVudEZvcm0nLCBldmVudEZvcm0pO1xuXG5cdGV2ZW50Rm9ybS4kaW5qZWN0ID0gWydldmVudERhdGEnLCAnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRmaWx0ZXInLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBldmVudEZvcm0oZXZlbnREYXRhLCAkdGltZW91dCwgJGxvY2F0aW9uLCAkZmlsdGVyLCBFdmVudCkge1xuXG5cdFx0ZXZlbnRGb3JtQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIGV2ZW50Rm9ybUN0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgZWYgPSB0aGlzO1xuXG5cdFx0XHQvLyBjaGVjayBpZiBmb3JtIGlzIGNyZWF0ZSBvciBlZGl0XG5cdFx0XHR2YXIgX2lzQ3JlYXRlID0galF1ZXJ5LmlzRW1wdHlPYmplY3QoZWYucHJlZmlsbE1vZGVsKSxcblx0XHRcdFx0X2lzRWRpdCA9ICFqUXVlcnkuaXNFbXB0eU9iamVjdChlZi5wcmVmaWxsTW9kZWwpO1xuXG5cdFx0XHRlZi50aW1lUmVnZXggPSAvXigwP1sxLTldfDFbMDEyXSkoOlswLTVdXFxkKSBbQVBhcF1bbU1dJC9pO1xuXG5cdFx0XHRpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRlZi5mb3JtTW9kZWwgPSBlZi5wcmVmaWxsTW9kZWw7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHByZXZlbnQgc2VsZWN0aW5nIGRhdGVzIGluIHRoZSBwYXN0XG5cdFx0XHRlZi5taW5EYXRlID0gbmV3IERhdGUoKTtcblxuXHRcdFx0ZWYuZGF0ZU9wdGlvbnMgPSB7XG5cdFx0XHRcdHNob3dXZWVrczogZmFsc2Vcblx0XHRcdH07XG5cblx0XHRcdGVmLnN0YXJ0RGF0ZU9wZW4gPSBmYWxzZTtcblx0XHRcdGVmLmVuZERhdGVPcGVuID0gZmFsc2U7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVG9nZ2xlIHRoZSBkYXRlcGlja2VyIG9wZW4vY2xvc2VkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtICRldmVudCB7b2JqZWN0fVxuXHRcdFx0ICogQHBhcmFtIGRhdGVOYW1lIHtzdHJpbmd9IHN0YXJ0RGF0ZSAvIGVuZERhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZWYudG9nZ2xlRGF0ZXBpY2tlciA9IGZ1bmN0aW9uKCRldmVudCwgZGF0ZU5hbWUpIHtcblx0XHRcdFx0JGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdCRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHRcdFx0XHRlZltkYXRlTmFtZSArICdPcGVuJ10gPSAhZWZbZGF0ZU5hbWUgKyAnT3BlbiddO1xuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBPbiBzdGFydCBkYXRlIHZhbGlkIGJsdXIsIHVwZGF0ZSBlbmQgZGF0ZSBpZiBlbXB0eVxuXHRcdFx0ICovXG5cdFx0XHRlZi5zdGFydERhdGVCbHVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChlZi5mb3JtTW9kZWwgJiYgZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSAmJiAhZWYuZm9ybU1vZGVsLmVuZERhdGUpIHtcblx0XHRcdFx0XHRlZi5mb3JtTW9kZWwuZW5kRGF0ZSA9ICRmaWx0ZXIoJ2RhdGUnKShlZi5mb3JtTW9kZWwuc3RhcnREYXRlLCAnTU0vZGQveXl5eScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJlc2V0IHRoZSBzdGF0ZSBvZiB0aGUgZm9ybSBTdWJtaXQgYnV0dG9uXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2J0blN1Ym1pdFJlc2V0KCkge1xuXHRcdFx0XHRlZi5idG5TYXZlZCA9IGZhbHNlO1xuXHRcdFx0XHRlZi5idG5TdWJtaXRUZXh0ID0gX2lzQ3JlYXRlID8gJ1N1Ym1pdCcgOiAnVXBkYXRlJztcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHbyB0byBFdmVudHMgdGFiXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX2dvVG9FdmVudHMoKSB7XG5cdFx0XHRcdCRsb2NhdGlvbi5zZWFyY2goJ3ZpZXcnLCAnZXZlbnRzJyk7XG5cdFx0XHR9XG5cblx0XHRcdF9idG5TdWJtaXRSZXNldCgpO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBldmVudCBBUEkgY2FsbCBzdWNjZWVkZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXZlbnRTdWNjZXNzKCkge1xuXHRcdFx0XHRlZi5idG5TYXZlZCA9IHRydWU7XG5cdFx0XHRcdGVmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU2F2ZWQhJyA6ICdVcGRhdGVkISc7XG5cblx0XHRcdFx0aWYgKF9pc0NyZWF0ZSkge1xuXHRcdFx0XHRcdGVmLnNob3dSZWRpcmVjdE1zZyA9IHRydWU7XG5cdFx0XHRcdFx0JHRpbWVvdXQoX2dvVG9FdmVudHMsIDI1MDApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHRlZi5zaG93VXBkYXRlRGV0YWlsTGluayA9IHRydWU7XG5cdFx0XHRcdFx0JHRpbWVvdXQoX2J0blN1Ym1pdFJlc2V0LCAyNTAwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIGZvciBldmVudCBBUEkgY2FsbCBlcnJvclxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9ldmVudEVycm9yKCkge1xuXHRcdFx0XHRlZi5idG5TYXZlZCA9ICdlcnJvcic7XG5cdFx0XHRcdGVmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnRXJyb3Igc2F2aW5nIScgOiAnRXJyb3IgdXBkYXRpbmchJztcblxuXHRcdFx0XHQkdGltZW91dChfYnRuU3VibWl0UmVzZXQsIDMwMDApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIGlmIGV2ZW50IHN0YXJ0IGFuZCBlbmQgZGF0ZXRpbWVzIGFyZSBhIHZhbGlkIHJhbmdlXG5cdFx0XHQgKiBSdW5zIG9uIGJsdXIgb2YgZXZlbnQgZGF0ZXMvdGltZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHRcdCAqL1xuXHRcdFx0ZWYudmFsaWRhdGVEYXRlcmFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKGVmLmZvcm1Nb2RlbCAmJiBlZi5mb3JtTW9kZWwuc3RhcnREYXRlICYmIGVmLmZvcm1Nb2RlbC5zdGFydFRpbWUgJiYgZWYuZm9ybU1vZGVsLmVuZERhdGUgJiYgZWYuZm9ybU1vZGVsLmVuZFRpbWUpIHtcblx0XHRcdFx0XHR2YXIgc3RhcnREYXRldGltZSA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZWYuZm9ybU1vZGVsLnN0YXJ0RGF0ZSwgZWYuZm9ybU1vZGVsLnN0YXJ0VGltZSksXG5cdFx0XHRcdFx0XHRlbmREYXRldGltZSA9IEV2ZW50LmdldEpTRGF0ZXRpbWUoZWYuZm9ybU1vZGVsLmVuZERhdGUsIGVmLmZvcm1Nb2RlbC5lbmRUaW1lKTtcblxuXHRcdFx0XHRcdGVmLnZhbGlkRGF0ZXJhbmdlID0gKHN0YXJ0RGF0ZXRpbWUgLSBlbmREYXRldGltZSkgPCAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIENsaWNrIHN1Ym1pdCBidXR0b25cblx0XHRcdCAqIFN1Ym1pdCBuZXcgZXZlbnQgdG8gQVBJXG5cdFx0XHQgKiBGb3JtIEAgZXZlbnRGb3JtLnRwbC5odG1sXG5cdFx0XHQgKi9cblx0XHRcdGVmLnN1Ym1pdEV2ZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChfaXNDcmVhdGUpIHtcblx0XHRcdFx0XHRldmVudERhdGEuY3JlYXRlRXZlbnQoZWYuZm9ybU1vZGVsKS50aGVuKF9ldmVudFN1Y2Nlc3MsIF9ldmVudEVycm9yKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKF9pc0VkaXQpIHtcblx0XHRcdFx0XHRldmVudERhdGEudXBkYXRlRXZlbnQoZWYuZm9ybU1vZGVsLl9pZCwgZWYuZm9ybU1vZGVsKS50aGVuKF9ldmVudFN1Y2Nlc3MsIF9ldmVudEVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRwcmVmaWxsTW9kZWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnL25nLWFwcC9hZG1pbi9ldmVudEZvcm0udHBsLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogZXZlbnRGb3JtQ3RybCxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2VmJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCd2YWxpZGF0ZURhdGVGdXR1cmUnLCB2YWxpZGF0ZURhdGVGdXR1cmUpO1xuXG5cdHZhbGlkYXRlRGF0ZUZ1dHVyZS4kaW5qZWN0ID0gWydldmVudERhdGEnLCAnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRmaWx0ZXInLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiB2YWxpZGF0ZURhdGVGdXR1cmUoKSB7XG5cblx0XHR2YWxpZGF0ZURhdGVGdXR1cmVMaW5rLiRpbmplY3QgPSBbJyRzY29wZScsICckZWxlbScsICckYXR0cnMnLCAnbmdNb2RlbCddO1xuXG5cdFx0ZnVuY3Rpb24gdmFsaWRhdGVEYXRlRnV0dXJlTGluaygkc2NvcGUsICRlbGVtLCAkYXR0cnMsIG5nTW9kZWwpIHtcblx0XHRcdHZhciBfbm93ID0gbmV3IERhdGUoKSxcblx0XHRcdFx0X3llc3RlcmRheSA9IF9ub3cuc2V0RGF0ZShfbm93LmdldERhdGUoKSAtIDEpO1xuXG5cdFx0XHRuZ01vZGVsLiRwYXJzZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIF9kID0gRGF0ZS5wYXJzZSh2YWx1ZSksXG5cdFx0XHRcdFx0X3ZhbGlkID0gX3llc3RlcmRheSAtIF9kIDwgMDtcblxuXHRcdFx0XHRuZ01vZGVsLiRzZXRWYWxpZGl0eSgncGFzdERhdGUnLCBfdmFsaWQpO1xuXG5cdFx0XHRcdHJldHVybiBfdmFsaWQgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcblx0XHRcdH0pO1xuXG5cdFx0XHRuZ01vZGVsLiRmb3JtYXR0ZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIF9kID0gRGF0ZS5wYXJzZSh2YWx1ZSksXG5cdFx0XHRcdFx0X3ZhbGlkID0gX3llc3RlcmRheSAtIF9kIDwgMDtcblxuXHRcdFx0XHRuZ01vZGVsLiRzZXRWYWxpZGl0eSgncGFzdERhdGUnLCBfdmFsaWQpO1xuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IHZhbGlkYXRlRGF0ZUZ1dHVyZUxpbmtcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCd2aWV3RXZlbnRHdWVzdHMnLCB2aWV3RXZlbnRHdWVzdHMpO1xuXG5cdHZpZXdFdmVudEd1ZXN0cy4kaW5qZWN0ID0gWydyc3ZwRGF0YSddO1xuXG5cdGZ1bmN0aW9uIHZpZXdFdmVudEd1ZXN0cyhyc3ZwRGF0YSkge1xuXG5cdFx0dmlld0V2ZW50R3Vlc3RzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuXHRcdGZ1bmN0aW9uIHZpZXdFdmVudEd1ZXN0c0N0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgZyA9IHRoaXM7XG5cblx0XHRcdCRzY29wZS4kd2F0Y2goJ2cuZXZlbnRJZCcsIGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIFJTVlBzIGZvciB0aGlzIGV2ZW50XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIEBwYXJhbSBkYXRhIHtBcnJheX0gZ3Vlc3RzIGFycmF5XG5cdFx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRmdW5jdGlvbiBfZ2V0R3Vlc3RzU3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRcdFx0dmFyIF90b3RhbEd1ZXN0cyA9IDA7XG5cblx0XHRcdFx0XHRnLmd1ZXN0cyA9IGRhdGE7XG5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGcuZ3Vlc3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRfdG90YWxHdWVzdHMgKz0gZy5ndWVzdHNbaV0uZ3Vlc3RzO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGcudG90YWxHdWVzdHMgPSBfdG90YWxHdWVzdHM7XG5cdFx0XHRcdFx0Zy5ndWVzdHNSZWFkeSA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobmV3VmFsKSB7XG5cdFx0XHRcdFx0Zy5ndWVzdHNSZWFkeSA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0cnN2cERhdGEuZ2V0RXZlbnRHdWVzdHMobmV3VmFsKS50aGVuKF9nZXRHdWVzdHNTdWNjZXNzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xvc2UgdGhpcyBtb2RhbCBkaXJlY3RpdmVcblx0XHRcdCAqL1xuXHRcdFx0Zy5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGcuc2hvd01vZGFsID0gZmFsc2U7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGV2ZW50SWQ6ICc9Jyxcblx0XHRcdFx0ZXZlbnROYW1lOiAnPScsXG5cdFx0XHRcdHNob3dNb2RhbDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICcvbmctYXBwL2FkbWluL3ZpZXdFdmVudEd1ZXN0cy50cGwuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiB2aWV3RXZlbnRHdWVzdHNDdHJsLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZycsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fVxuXHR9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0V2ZW50c0N0cmwnLCBFdmVudHNDdHJsKTtcblxuXHRFdmVudHNDdHJsLiRpbmplY3QgPSBbJyRhdXRoJywgJ2V2ZW50RGF0YScsICdFdmVudCddO1xuXG5cdGZ1bmN0aW9uIEV2ZW50c0N0cmwoJGF1dGgsIGV2ZW50RGF0YSwgRXZlbnQpIHtcblx0XHR2YXIgZXZlbnRzID0gdGhpcztcblxuXHRcdC8qKlxuXHRcdCAqIERldGVybWluZXMgaWYgdGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZFxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0ICovXG5cdFx0ZXZlbnRzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuICRhdXRoLmlzQXV0aGVudGljYXRlZCgpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIGV2ZW50cyBsaXN0XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZGF0YSB7QXJyYXl9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2V2ZW50c1N1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0ZXZlbnRzLmFsbEV2ZW50cyA9IGRhdGE7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmFsbEV2ZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgdGhpc0V2dCA9IGV2ZW50cy5hbGxFdmVudHNbaV07XG5cblx0XHRcdFx0dGhpc0V2dC5zdGFydERhdGVKUyA9IEV2ZW50LmdldEpTRGF0ZXRpbWUodGhpc0V2dC5zdGFydERhdGUsIHRoaXNFdnQuc3RhcnRUaW1lKTtcblx0XHRcdFx0dGhpc0V2dC5leHBpcmVkID0gRXZlbnQuZXhwaXJlZCh0aGlzRXZ0KTtcblx0XHRcdH1cblxuXHRcdFx0ZXZlbnRzLmV2ZW50c1JlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRldmVudERhdGEuZ2V0QWxsRXZlbnRzKCkudGhlbihfZXZlbnRzU3VjY2Vzcyk7XG5cblx0XHQvKipcblx0XHQgKiBDdXN0b20gc29ydCBmdW5jdGlvblxuXHRcdCAqIEdldCBldmVudCBzdGFydCBkYXRlIGFuZCBjaGFuZ2UgdG8gcmVhbCBkYXRlIHRvIHNvcnQgYnlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBldnQge29iamVjdH0gZXZlbnQgb2JqZWN0XG5cdFx0ICogQHJldHVybnMge0RhdGV9XG5cdFx0ICovXG5cdFx0ZXZlbnRzLnNvcnRTdGFydERhdGUgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdHJldHVybiBFdmVudC5nZXRKU0RhdGV0aW1lKGV2dC5zdGFydERhdGUsIGV2dC5zdGFydFRpbWUpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDbGVhciBzZWFyY2ggcXVlcnlcblx0XHQgKi9cblx0XHQvL2V2ZW50cy5jbGVhclF1ZXJ5ID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly9cdGV2ZW50cy5xdWVyeSA9ICcnO1xuXHRcdC8vfTtcblx0fVxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5maWx0ZXIoJ3ByZXR0eURhdGUnLCBwcmV0dHlEYXRlKTtcblxuXHRmdW5jdGlvbiBwcmV0dHlEYXRlKCkge1xuXHRcdC8qKlxuXHRcdCAqIFRha2VzIGEgZGF0ZSBzdHJpbmcgYW5kIGNvbnZlcnRzIGl0IHRvIGEgcHJldHR5IGRhdGVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRlU3RyIHtzdHJpbmd9XG5cdFx0ICovXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIChkYXRlU3RyKSB7XG5cdFx0XHR2YXIgZCA9IG5ldyBEYXRlKGRhdGVTdHIpLFxuXHRcdFx0XHRtb250aHNBcnIgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ10sXG5cdFx0XHRcdG1vbnRoID0gbW9udGhzQXJyW2QuZ2V0TW9udGgoKV0sXG5cdFx0XHRcdGRheSA9IGQuZ2V0RGF0ZSgpLFxuXHRcdFx0XHR5ZWFyID0gZC5nZXRGdWxsWWVhcigpLFxuXHRcdFx0XHRwcmV0dHlEYXRlO1xuXG5cdFx0XHRwcmV0dHlEYXRlID0gbW9udGggKyAnICcgKyBkYXkgKyAnLCAnICsgeWVhcjtcblxuXHRcdFx0cmV0dXJuIHByZXR0eURhdGU7XG5cdFx0fTtcblx0fVxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdteUFwcCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0V2ZW50RGV0YWlsQ3RybCcsIEV2ZW50RGV0YWlsQ3RybCk7XG5cblx0RXZlbnREZXRhaWxDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJGF1dGgnLCAndXNlckRhdGEnLCAnZXZlbnREYXRhJywgJyRyb290U2NvcGUnLCAnRXZlbnQnXTtcblxuXHRmdW5jdGlvbiBFdmVudERldGFpbEN0cmwoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRhdXRoLCB1c2VyRGF0YSwgZXZlbnREYXRhLCAkcm9vdFNjb3BlLCBFdmVudCkge1xuXHRcdHZhciBldmVudCA9IHRoaXMsXG5cdFx0XHRfZXZlbnRJZCA9ICRyb3V0ZVBhcmFtcy5ldmVudElkO1xuXG5cdFx0LyoqXG5cdFx0ICogRGV0ZXJtaW5lcyBpZiB0aGUgdXNlciBpcyBhdXRoZW50aWNhdGVkXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHQgKi9cblx0XHRldmVudC5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiAkYXV0aC5pc0F1dGhlbnRpY2F0ZWQoKTtcblx0XHR9O1xuXG5cdFx0ZXZlbnQuc2hvd01vZGFsID0gZmFsc2U7XG5cblx0XHRldmVudC5vcGVuUnN2cE1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRldmVudC5zaG93TW9kYWwgPSB0cnVlO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBGZXRjaCB0aGUgdXNlcidzIGRhdGEgYW5kIHByb2Nlc3MgUlNWUCBpbmZvcm1hdGlvblxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZ2V0VXNlckRhdGEoKSB7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIHN1Y2Nlc3NmdWwgQVBJIGNhbGwgcmV0cmlldmluZyB1c2VyIGRhdGFcblx0XHRcdCAqIENoZWNrIGlmIHVzZXIgaXMgYWRtaW5cblx0XHRcdCAqIFRoZW4gY2FsbHMgUlNWUCBkYXRhIGFuZCBkZXRlcm1pbmVzIGlmIHVzZXIgaGFzIFJTVlBlZCB0byB0aGlzIGV2ZW50XG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIGRhdGEge29iamVjdH0gcHJvbWlzZSBwcm92aWRlZCBieSAkaHR0cCBzdWNjZXNzXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfdXNlclN1Y2Nlc3MoZGF0YSkge1xuXHRcdFx0XHRldmVudC51c2VyID0gZGF0YTtcblx0XHRcdFx0ZXZlbnQuaXNBZG1pbiA9IGRhdGEuaXNBZG1pbjtcblxuXHRcdFx0XHR2YXIgX3JzdnBzID0gZXZlbnQudXNlci5yc3ZwcztcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IF9yc3Zwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHZhciB0aGlzUnN2cCA9IF9yc3Zwc1tpXTtcblxuXHRcdFx0XHRcdGlmICh0aGlzUnN2cC5ldmVudElkID09PSBfZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucnN2cE9iaiA9IHRoaXNSc3ZwO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXZlbnQubm9Sc3ZwID0gIWV2ZW50LnJzdnBPYmo7XG5cblx0XHRcdFx0dmFyIGd1ZXN0cyA9ICFldmVudC5ub1JzdnAgPyBldmVudC5yc3ZwT2JqLmd1ZXN0cyA6IG51bGw7XG5cblx0XHRcdFx0aWYgKCFldmVudC5ub1JzdnAgJiYgISFndWVzdHMgPT09IGZhbHNlIHx8IGd1ZXN0cyA9PSAxKSB7XG5cdFx0XHRcdFx0ZXZlbnQuZ3Vlc3RUZXh0ID0gZXZlbnQucnN2cE9iai5uYW1lICsgJyBpcyc7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZ3Vlc3RzICYmIGd1ZXN0cyA+IDEpIHtcblx0XHRcdFx0XHRldmVudC5ndWVzdFRleHQgPSBldmVudC5yc3ZwT2JqLm5hbWUgKyAnICsgJyArIChndWVzdHMgLSAxKSArICcgYXJlICc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRldmVudC5hdHRlbmRpbmdUZXh0ID0gIWV2ZW50Lm5vUnN2cCAmJiBldmVudC5yc3ZwT2JqLmF0dGVuZGluZyA/ICdhdHRlbmRpbmcnIDogJ25vdCBhdHRlbmRpbmcnO1xuXHRcdFx0XHRldmVudC5yc3ZwQnRuVGV4dCA9IGV2ZW50Lm5vUnN2cCA/ICdSU1ZQJyA6ICdVcGRhdGUgbXkgUlNWUCc7XG5cdFx0XHRcdGV2ZW50LnNob3dFdmVudERvd25sb2FkID0gZXZlbnQucnN2cE9iaiAmJiBldmVudC5yc3ZwT2JqLmF0dGVuZGluZztcblx0XHRcdFx0ZXZlbnQuY3JlYXRlT3JVcGRhdGUgPSBldmVudC5ub1JzdnAgPyAnY3JlYXRlJyA6ICd1cGRhdGUnO1xuXHRcdFx0XHRldmVudC5yc3ZwUmVhZHkgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR1c2VyRGF0YS5nZXRVc2VyKCkudGhlbihfdXNlclN1Y2Nlc3MpO1xuXHRcdH1cblxuXHRcdF9nZXRVc2VyRGF0YSgpO1xuXG5cdFx0Ly8gd2hlbiBSU1ZQIGhhcyBiZWVuIHN1Ym1pdHRlZCwgdXBkYXRlIHVzZXIgZGF0YVxuXHRcdCRyb290U2NvcGUuJG9uKCdyc3ZwU3VibWl0dGVkJywgX2dldFVzZXJEYXRhKTtcblxuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIC5pY3MgZmlsZSBmb3IgdGhpcyBldmVudFxuXHRcdCAqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBfZ2VuZXJhdGVJY2FsKCkge1xuXHRcdFx0ZXZlbnQuY2FsID0gaWNzKCk7XG5cblx0XHRcdHZhciBfc3RhcnREID0gRXZlbnQuZ2V0SlNEYXRldGltZShldmVudC5kZXRhaWwuc3RhcnREYXRlLCBldmVudC5kZXRhaWwuc3RhcnRUaW1lKSxcblx0XHRcdFx0X2VuZEQgPSBFdmVudC5nZXRKU0RhdGV0aW1lKGV2ZW50LmRldGFpbC5lbmREYXRlLCBldmVudC5kZXRhaWwuZW5kVGltZSk7XG5cblx0XHRcdGV2ZW50LmNhbC5hZGRFdmVudChldmVudC5kZXRhaWwudGl0bGUsIGV2ZW50LmRldGFpbC5kZXNjcmlwdGlvbiwgZXZlbnQuZGV0YWlsLmxvY2F0aW9uLCBfc3RhcnRELCBfZW5kRCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRG93bmxvYWQgLmljcyBmaWxlXG5cdFx0ICovXG5cdFx0ZXZlbnQuZG93bmxvYWRJY3MgPSBmdW5jdGlvbigpIHtcblx0XHRcdGV2ZW50LmNhbC5kb3dubG9hZCgpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBGdW5jdGlvbiBmb3Igc3VjY2Vzc2Z1bCBBUEkgY2FsbCBnZXR0aW5nIHNpbmdsZSBldmVudCBkZXRhaWxcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkYXRhIHtvYmplY3R9IHByb21pc2UgcHJvdmlkZWQgYnkgJGh0dHAgc3VjY2Vzc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gX2V2ZW50U3VjY2VzcyhkYXRhKSB7XG5cdFx0XHRldmVudC5kZXRhaWwgPSBkYXRhO1xuXHRcdFx0ZXZlbnQuZGV0YWlsLnByZXR0eURhdGUgPSBFdmVudC5nZXRQcmV0dHlEYXRldGltZShldmVudC5kZXRhaWwpO1xuXHRcdFx0ZXZlbnQuZGV0YWlsLmV4cGlyZWQgPSBFdmVudC5leHBpcmVkKGV2ZW50LmRldGFpbCk7XG5cdFx0XHRldmVudC5ldmVudFJlYWR5ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRldmVudERhdGEuZ2V0RXZlbnQoX2V2ZW50SWQpLnRoZW4oX2V2ZW50U3VjY2Vzcyk7XG5cblx0XHR2YXIgX3dhdGNoUnN2cFJlYWR5ID0gJHNjb3BlLiR3YXRjaCgnZXZlbnQucnN2cFJlYWR5JywgZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwpIHtcblx0XHRcdGlmIChuZXdWYWwgJiYgZXZlbnQuZGV0YWlsICYmIGV2ZW50LmRldGFpbC5yc3ZwKSB7XG5cdFx0XHRcdF9nZW5lcmF0ZUljYWwoKTtcblx0XHRcdFx0X3dhdGNoUnN2cFJlYWR5KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuZGlyZWN0aXZlKCdyc3ZwRm9ybScsIHJzdnBGb3JtKTtcblxuXHRyc3ZwRm9ybS4kaW5qZWN0ID0gWydyc3ZwRGF0YScsICckdGltZW91dCcsICckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gcnN2cEZvcm0ocnN2cERhdGEsICR0aW1lb3V0LCAkcm9vdFNjb3BlKSB7XG5cblx0XHRyc3ZwRm9ybUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cblx0XHRmdW5jdGlvbiByc3ZwRm9ybUN0cmwoJHNjb3BlKSB7XG5cdFx0XHQvLyBjb250cm9sbGVyQXMgc3ludGF4XG5cdFx0XHR2YXIgcmYgPSB0aGlzO1xuXG5cdFx0XHQvLyBjaGVjayBpZiBmb3JtIGlzIGNyZWF0ZSBvciBlZGl0IChkb2VzIHRoZSBtb2RlbCBhbHJlYWR5IGV4aXN0IG9yIG5vdClcblx0XHRcdHZhciBfaXNDcmVhdGUgPSAhcmYuZm9ybU1vZGVsLFxuXHRcdFx0XHRfaXNFZGl0ID0gISFyZi5mb3JtTW9kZWw7XG5cblx0XHRcdHJmLm51bWJlclJlZ2V4ID0gL14oWzEtOV18MTApJC87XG5cblx0XHRcdGlmIChfaXNDcmVhdGUgJiYgcmYudXNlck5hbWUpIHtcblx0XHRcdFx0cmYuZm9ybU1vZGVsID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogcmYudXNlcklkLFxuXHRcdFx0XHRcdGV2ZW50TmFtZTogcmYuZXZlbnQudGl0bGUsXG5cdFx0XHRcdFx0bmFtZTogcmYudXNlck5hbWVcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBXcmFwICR3YXRjaCBpbiBhIGZ1bmN0aW9uIHNvIHRoYXQgaXQgY2FuIGJlIHJlLWluaXRpYWxpemVkIGFmdGVyIGl0J3MgYmVlbiBkZXJlZ2lzdGVyZWRcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3N0YXJ0V2F0Y2hBdHRlbmRpbmcoKSB7XG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBXYXRjaCB1c2VyJ3MgYXR0ZW5kaW5nIGlucHV0IGFuZCBpZiB0cnVlLCBzZXQgZGVmYXVsdCBudW1iZXIgb2YgZ3Vlc3RzIHRvIDFcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogQHR5cGUgeyp8ZnVuY3Rpb24oKX1cblx0XHRcdFx0ICogQHByaXZhdGVcblx0XHRcdFx0ICovXG5cdFx0XHRcdHZhciBfd2F0Y2hBdHRlbmRpbmcgPSAkc2NvcGUuJHdhdGNoKCdyZi5mb3JtTW9kZWwuYXR0ZW5kaW5nJywgZnVuY3Rpb24gKG5ld1ZhbCwgb2xkVmFsKSB7XG5cdFx0XHRcdFx0aWYgKG5ld1ZhbCA9PT0gdHJ1ZSAmJiAhb2xkVmFsICYmICFyZi5mb3JtTW9kZWwuZ3Vlc3RzKSB7XG5cdFx0XHRcdFx0XHRyZi5mb3JtTW9kZWwuZ3Vlc3RzID0gMTtcblxuXHRcdFx0XHRcdFx0Ly8gZGVyZWdpc3RlciAkd2F0Y2hcblx0XHRcdFx0XHRcdF93YXRjaEF0dGVuZGluZygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0YXJ0IHdhdGNoaW5nIHJmLmZvcm1Nb2RlbC5hdHRlbmRpbmdcblx0XHRcdF9zdGFydFdhdGNoQXR0ZW5kaW5nKCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmVzZXQgdGhlIHN0YXRlIG9mIHRoZSBmb3JtIFN1Ym1pdCBidXR0b25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfYnRuU3VibWl0UmVzZXQoKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gZmFsc2U7XG5cdFx0XHRcdHJmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU3VibWl0IFJTVlAnIDogJ1VwZGF0ZSBSU1ZQJztcblx0XHRcdH1cblxuXHRcdFx0X2J0blN1Ym1pdFJlc2V0KCk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gZm9yIFJTVlAgQVBJIGNhbGwgc3VjY2VlZGVkXG5cdFx0XHQgKlxuXHRcdFx0ICogQHByaXZhdGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gX3JzdnBTdWNjZXNzKCkge1xuXHRcdFx0XHRyZi5idG5TYXZlZCA9IHRydWU7XG5cdFx0XHRcdHJmLmJ0blN1Ym1pdFRleHQgPSBfaXNDcmVhdGUgPyAnU3VibWl0dGVkIScgOiAnVXBkYXRlZCEnO1xuXG5cdFx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgncnN2cFN1Ym1pdHRlZCcpO1xuXG5cdFx0XHRcdC8vIHVzZXIgaGFzIHN1Ym1pdHRlZCBhbiBSU1ZQOyB1cGRhdGUgY3JlYXRlL2VkaXQgc3RhdHVzIGluIGNhc2UgdGhleSBlZGl0IHdpdGhvdXQgcmVmcmVzaGluZ1xuXHRcdFx0XHRfaXNDcmVhdGUgPSBmYWxzZTtcblx0XHRcdFx0X2lzRWRpdCA9IHRydWU7XG5cblx0XHRcdFx0Ly8gcmVzdGFydCAkd2F0Y2ggb24gcmYuZm9ybU1vZGVsLmF0dGVuZGluZ1xuXHRcdFx0XHRfc3RhcnRXYXRjaEF0dGVuZGluZygpO1xuXG5cdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdF9idG5TdWJtaXRSZXNldCgpO1xuXHRcdFx0XHRcdHJmLnNob3dNb2RhbCA9IGZhbHNlO1xuXHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBGdW5jdGlvbiBmb3IgUlNWUCBBUEkgY2FsbCBlcnJvclxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9yc3ZwRXJyb3IoKSB7XG5cdFx0XHRcdHJmLmJ0blNhdmVkID0gJ2Vycm9yJztcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9IF9pc0NyZWF0ZSA/ICdFcnJvciBzdWJtaXR0aW5nIScgOiAnRXJyb3IgdXBkYXRpbmchJztcblxuXHRcdFx0XHQkdGltZW91dChfYnRuU3VibWl0UmVzZXQsIDMwMDApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIENsaWNrIHN1Ym1pdCBidXR0b25cblx0XHRcdCAqIFN1Ym1pdCBSU1ZQIHRvIEFQSVxuXHRcdFx0ICogRm9ybSBAIHJzdnBGb3JtLnRwbC5odG1sXG5cdFx0XHQgKi9cblx0XHRcdHJmLnN1Ym1pdFJzdnAgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmYuYnRuU3VibWl0VGV4dCA9ICdTZW5kaW5nLi4uJztcblxuXHRcdFx0XHRpZiAoX2lzQ3JlYXRlKSB7XG5cdFx0XHRcdFx0cnN2cERhdGEuY3JlYXRlUnN2cChyZi5ldmVudC5faWQsIHJmLmZvcm1Nb2RlbCkudGhlbihfcnN2cFN1Y2Nlc3MsIF9yc3ZwRXJyb3IpO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoX2lzRWRpdCkge1xuXHRcdFx0XHRcdHJzdnBEYXRhLnVwZGF0ZVJzdnAocmYuZm9ybU1vZGVsLl9pZCwgcmYuZm9ybU1vZGVsKS50aGVuKF9yc3ZwU3VjY2VzcywgX3JzdnBFcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ2xpY2sgZnVuY3Rpb24gdG8gY2xvc2UgdGhlIG1vZGFsIHdpbmRvd1xuXHRcdFx0ICovXG5cdFx0XHRyZi5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJmLnNob3dNb2RhbCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGV2ZW50OiAnPScsXG5cdFx0XHRcdHVzZXJOYW1lOiAnQCcsXG5cdFx0XHRcdHVzZXJJZDogJ0AnLFxuXHRcdFx0XHRmb3JtTW9kZWw6ICc9Jyxcblx0XHRcdFx0c2hvd01vZGFsOiAnPSdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJy9uZy1hcHAvZXZlbnQtZGV0YWlsL3JzdnBGb3JtLnRwbC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6IHJzdnBGb3JtQ3RybCxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3JmJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9XG5cdH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxyXG5cdFx0LmNvbnRyb2xsZXIoJ0hlYWRlckN0cmwnLCBoZWFkZXJDdHJsKTtcclxuXHJcblx0aGVhZGVyQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgJ2xvY2FsRGF0YScsICckYXV0aCcsICd1c2VyRGF0YSddO1xyXG5cclxuXHRmdW5jdGlvbiBoZWFkZXJDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBsb2NhbERhdGEsICRhdXRoLCB1c2VyRGF0YSkge1xyXG5cdFx0Ly8gY29udHJvbGxlckFzIFZpZXdNb2RlbFxyXG5cdFx0dmFyIGhlYWRlciA9IHRoaXM7XHJcblxyXG5cdFx0ZnVuY3Rpb24gX2xvY2FsRGF0YVN1Y2Nlc3MoZGF0YSkge1xyXG5cdFx0XHRoZWFkZXIubG9jYWxEYXRhID0gZGF0YTtcclxuXHRcdH1cclxuXHJcblx0XHRsb2NhbERhdGEuZ2V0SlNPTigpLnRoZW4oX2xvY2FsRGF0YVN1Y2Nlc3MpO1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogTG9nIHRoZSB1c2VyIG91dCBvZiB3aGF0ZXZlciBhdXRoZW50aWNhdGlvbiB0aGV5J3ZlIHNpZ25lZCBpbiB3aXRoXHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0aGVhZGVyLmFkbWluVXNlciA9IHVuZGVmaW5lZDtcclxuXHRcdFx0JGF1dGgubG9nb3V0KCcvbG9naW4nKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBJZiB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQgYW5kIGFkbWluVXNlciBpcyB1bmRlZmluZWQsXHJcblx0XHQgKiBnZXQgdGhlIHVzZXIgYW5kIHNldCBhZG1pblVzZXIgYm9vbGVhbi5cclxuXHRcdCAqXHJcblx0XHQgKiBEbyB0aGlzIG9uIGZpcnN0IGNvbnRyb2xsZXIgbG9hZCAoaW5pdCwgcmVmcmVzaClcclxuXHRcdCAqIGFuZCBzdWJzZXF1ZW50IGxvY2F0aW9uIGNoYW5nZXMgKGllLCBjYXRjaGluZyBsb2dvdXQsIGxvZ2luLCBldGMpLlxyXG5cdFx0ICpcclxuXHRcdCAqIEBwcml2YXRlXHJcblx0XHQgKi9cclxuXHRcdGZ1bmN0aW9uIF9jaGVja1VzZXJBZG1pbigpIHtcclxuXHRcdFx0Ly8gaWYgdXNlciBpcyBhdXRoZW50aWNhdGVkIGFuZCBub3QgZGVmaW5lZCB5ZXQsIGNoZWNrIGlmIHRoZXkncmUgYW4gYWRtaW5cclxuXHRcdFx0aWYgKCRhdXRoLmlzQXV0aGVudGljYXRlZCgpICYmIGhlYWRlci5hZG1pblVzZXIgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHVzZXJEYXRhLmdldFVzZXIoKVxyXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdFx0XHRoZWFkZXIuYWRtaW5Vc2VyID0gZGF0YS5pc0FkbWluO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdF9jaGVja1VzZXJBZG1pbigpO1xyXG5cdFx0JHNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIF9jaGVja1VzZXJBZG1pbik7XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBJcyB0aGUgdXNlciBhdXRoZW50aWNhdGVkP1xyXG5cdFx0ICpcclxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHJldHVybiAkYXV0aC5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDdXJyZW50bHkgYWN0aXZlIG5hdiBpdGVtIHdoZW4gJy8nIGluZGV4XHJcblx0XHQgKlxyXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdFx0ICovXHJcblx0XHRoZWFkZXIuaW5kZXhJc0FjdGl2ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHRcdFx0Ly8gcGF0aCBzaG91bGQgYmUgJy8nXHJcblx0XHRcdHJldHVybiAkbG9jYXRpb24ucGF0aCgpID09PSBwYXRoO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEN1cnJlbnRseSBhY3RpdmUgbmF2IGl0ZW1cclxuXHRcdCAqXHJcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG5cdFx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0XHQgKi9cclxuXHRcdGhlYWRlci5uYXZJc0FjdGl2ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHRcdFx0cmV0dXJuICRsb2NhdGlvbi5wYXRoKCkuc3Vic3RyKDAsIHBhdGgubGVuZ3RoKSA9PT0gcGF0aDtcclxuXHRcdH07XHJcblx0fVxyXG5cclxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnbXlBcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ25hdkNvbnRyb2wnLCBuYXZDb250cm9sKTtcblxuXHRuYXZDb250cm9sLiRpbmplY3QgPSBbJ21lZGlhQ2hlY2snLCAnTVEnLCAnJHRpbWVvdXQnXTtcblxuXHRmdW5jdGlvbiBuYXZDb250cm9sKG1lZGlhQ2hlY2ssIE1RLCAkdGltZW91dCkge1xuXG5cdFx0bmF2Q29udHJvbExpbmsuJGluamVjdCA9IFsnJHNjb3BlJywgJyRlbGVtZW50JywgJyRhdHRycyddO1xuXG5cdFx0ZnVuY3Rpb24gbmF2Q29udHJvbExpbmsoJHNjb3BlKSB7XG5cdFx0XHQvLyBkYXRhIG9iamVjdFxuXHRcdFx0JHNjb3BlLm5hdiA9IHt9O1xuXG5cdFx0XHR2YXIgX2JvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJ2JvZHknKSxcblx0XHRcdFx0X25hdk9wZW47XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogT3BlbiBtb2JpbGUgbmF2aWdhdGlvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9vcGVuTmF2KCkge1xuXHRcdFx0XHRfYm9keVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnbmF2LWNsb3NlZCcpXG5cdFx0XHRcdFx0LmFkZENsYXNzKCduYXYtb3BlbicpO1xuXG5cdFx0XHRcdF9uYXZPcGVuID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDbG9zZSBtb2JpbGUgbmF2aWdhdGlvblxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9jbG9zZU5hdigpIHtcblx0XHRcdFx0X2JvZHlcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ25hdi1vcGVuJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ25hdi1jbG9zZWQnKTtcblxuXHRcdFx0XHRfbmF2T3BlbiA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBlbnRlcmluZyBtb2JpbGUgbWVkaWEgcXVlcnlcblx0XHRcdCAqIENsb3NlIG5hdiBhbmQgc2V0IHVwIG1lbnUgdG9nZ2xpbmcgZnVuY3Rpb25hbGl0eVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9lbnRlck1vYmlsZSgpIHtcblx0XHRcdFx0X2Nsb3NlTmF2KCk7XG5cblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8qKlxuXHRcdFx0XHRcdCAqIFRvZ2dsZSBtb2JpbGUgbmF2aWdhdGlvbiBvcGVuL2Nsb3NlZFxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdCRzY29wZS5uYXYudG9nZ2xlTmF2ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFfbmF2T3Blbikge1xuXHRcdFx0XHRcdFx0XHRfb3Blbk5hdigpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0X2Nsb3NlTmF2KCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JHNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIF9jbG9zZU5hdik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGV4aXRpbmcgbW9iaWxlIG1lZGlhIHF1ZXJ5XG5cdFx0XHQgKiBEaXNhYmxlIG1lbnUgdG9nZ2xpbmcgYW5kIHJlbW92ZSBib2R5IGNsYXNzZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAcHJpdmF0ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBfZXhpdE1vYmlsZSgpIHtcblx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCRzY29wZS5uYXYudG9nZ2xlTmF2ID0gbnVsbDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0X2JvZHkucmVtb3ZlQ2xhc3MoJ25hdi1jbG9zZWQgbmF2LW9wZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIGZ1bmN0aW9uYWxpdHkgdG8gcnVuIG9uIGVudGVyL2V4aXQgb2YgbWVkaWEgcXVlcnlcblx0XHRcdG1lZGlhQ2hlY2suaW5pdCh7XG5cdFx0XHRcdHNjb3BlOiAkc2NvcGUsXG5cdFx0XHRcdG1xOiBNUS5TTUFMTCxcblx0XHRcdFx0ZW50ZXI6IF9lbnRlck1vYmlsZSxcblx0XHRcdFx0ZXhpdDogX2V4aXRNb2JpbGVcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdGxpbms6IG5hdkNvbnRyb2xMaW5rXG5cdFx0fTtcblx0fVxuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ215QXBwJylcblx0XHQuY29udHJvbGxlcignTG9naW5DdHJsJywgTG9naW5DdHJsKTtcblxuXHRMb2dpbkN0cmwuJGluamVjdCA9IFsnJGF1dGgnLCAnT0FVVEgnLCAnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnbG9jYWxEYXRhJ107XG5cblx0ZnVuY3Rpb24gTG9naW5DdHJsKCRhdXRoLCBPQVVUSCwgJHJvb3RTY29wZSwgJGxvY2F0aW9uLCBsb2NhbERhdGEpIHtcblx0XHQvLyBjb250cm9sbGVyQXMgVmlld01vZGVsXG5cdFx0dmFyIGxvZ2luID0gdGhpcztcblxuXHRcdGZ1bmN0aW9uIF9sb2NhbERhdGFTdWNjZXNzKGRhdGEpIHtcblx0XHRcdGxvZ2luLmxvY2FsRGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0bG9jYWxEYXRhLmdldEpTT04oKS50aGVuKF9sb2NhbERhdGFTdWNjZXNzKTtcblxuXHRcdGxvZ2luLmxvZ2lucyA9IE9BVVRILkxPR0lOUztcblxuXHRcdC8qKlxuXHRcdCAqIEF1dGhlbnRpY2F0ZSB0aGUgdXNlciB2aWEgT2F1dGggd2l0aCB0aGUgc3BlY2lmaWVkIHByb3ZpZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSAodHdpdHRlciwgZmFjZWJvb2ssIGdpdGh1YiwgZ29vZ2xlKVxuXHRcdCAqL1xuXHRcdGxvZ2luLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG5cdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSB0cnVlO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFN1Y2Nlc3NmdWxseSBhdXRoZW50aWNhdGVkXG5cdFx0XHQgKiBHbyB0byBpbml0aWFsbHkgaW50ZW5kZWQgYXV0aGVudGljYXRlZCBwYXRoXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHJlc3BvbnNlIHtvYmplY3R9IHByb21pc2UgcmVzcG9uc2Vcblx0XHRcdCAqIEBwcml2YXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIF9hdXRoU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSBmYWxzZTtcblxuXHRcdFx0XHRpZiAoJHJvb3RTY29wZS5hdXRoUGF0aCkge1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCRyb290U2NvcGUuYXV0aFBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCRhdXRoLmF1dGhlbnRpY2F0ZShwcm92aWRlcilcblx0XHRcdFx0LnRoZW4oX2F1dGhTdWNjZXNzKVxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0XHRsb2dpbi5sb2dnaW5nSW4gPSAnZXJyb3InO1xuXHRcdFx0XHRcdGxvZ2luLmxvZ2luTXNnID0gJydcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==