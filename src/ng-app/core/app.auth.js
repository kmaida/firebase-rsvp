(function() {
	'use strict';

	angular
		.module('myApp')
		.run(authRun);

	authRun.$inject = ['$rootScope', '$location', 'Fire'];

	function authRun($rootScope, $location, Fire) {
		// authentication controls
		var _auth = Fire.auth();
		var _isAuthenticated;

		/**
		 * Success function from authenticating
		 *
		 * @param authData {object}
		 */
		function _getAuthData(authData) {
			if (authData) {
				_isAuthenticated = true;
			}
		}

		// on login or logout
		_auth.$onAuth(_getAuthData);

		$rootScope.$on('$routeChangeStart', function(event, next, current) {
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