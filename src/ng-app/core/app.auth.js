(function() {
	'use strict';

	angular
		.module('myApp')
		.run(authRun);

	authRun.$inject = ['$rootScope', '$location', 'Fire'];

	function authRun($rootScope, $location, Fire) {
		$rootScope.$on('$routeChangeStart', function(event, next, current) {
			var _isAuthenticated = !!Fire.ref.getAuth();

			if (next && next.$$route) {
				// if not authenticated, redirect to login page
				// if possible, after login, redirect to intended route (large mq)
				if (next.$$route.secure && !_isAuthenticated) {
					$rootScope.authPath = $location.path();

					$rootScope.$evalAsync(function() {
						// send user to login
						$location.path('/login');
					});
				}

				// if attempting to access /login route and already logged in, redirect to homepage
				// redirection to authPath only happens correctly with Google (not possible in some other Oauth services)
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