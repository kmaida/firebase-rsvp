# firebase-rsvp

An AngularJS / Firebase / AngularFire single-page application for managing events and RSVPs.

* AngularJS (built with [reStart-angular](https://github.com/kmaida/reStart-angular))
* Firebase ([Firebase](http://www.firebase.com))
* AngularFire ([AngularFire v1.0.0](https://www.firebase.com/docs/web/libraries/angular/))
* Event iCal (with [ics.js](https://github.com/nwcell/ics.js))
* FontAwesome (CDN)
* Bootstrap 3
* jQuery
* Gulp

## How to Use

### Dependencies

* [node](https://nodejs.org/) (>= v.0.10)
* [npm](https://www.npmjs.com/)
* [Gulp](http://gulpjs.com/)
* [Firebase account](http://www.firebase.com/account)
* Social media accounts and associated developer apps

#### Setting up dependencies
 
1. Install [node](https://nodejs.org/), [npm](https://www.npmjs.com/), and [Gulp](http://gulpjs.com/) locally on your machine
2. Sign up for a [Firebase account](http://www.firebase.com/account)
  * Create a new app (the free Hacker plan is fine for small apps)
  * Note your app's `URL`
3. Sign up for any social media accounts you'd like to use to authenticate
  1. Create developer apps for OAuth
     * [Twitter app configuration](https://www.firebase.com/docs/web/guide/login/twitter.html)
     * [Google app configuration](https://www.firebase.com/docs/web/guide/login/google.html)
     * [Facebook app configuration](https://www.firebase.com/docs/web/guide/login/facebook.html)
     * [GitHub app configuration](https://www.firebase.com/docs/web/guide/login/github.html)
  2. Go to your Firebase app's URL and click **Login & Auth**
  3. For development, `localhost` redirection URLs are already enabled. If deploying, enter your site's domain in **Authorized Domains for OAuth Redirects**.
  4. Click the tabs for each third party service you'd like to authenticate with
     * Click the checkbox to enable
     * Enter your apps' `ID`s and `secret`s
 
### Installation and Initial Build

**firebase-rsvp** needs a server in order to properly serve AngularJS routes. You may use a tool like MAMP or WAMP (an `.htaccess` file is provided in the repo for Apache servers), spin up a local Python or Node server, or use a development environment on a live web server.
 
1. Clone the repo or [download a release](https://github.com/kmaida/firebase-rsvp/releases)
2. Open a terminal or command line and run `npm install`
3. Open the `src/ng-app/core/FIREBASE.constant.sample.js` file and uncomment the code
4. Change the `URI` constant to your Firebase app's URL
5. Rename the file to `FIREBASE.constant.js` and Save
6. Run `gulp` from the terminal / command line to build the project files

### Firebase Configuration

You should already have set up your OAuth accounts (documented in the **Setting up dependencies** section above).

#### Setting up an Admin user

To create a single `admin` level user (the user who can manage events; everyone else will only be able to RSVP), do the following:

1. Log into your running **firebase-rsvp** app with the OAuth account you wish to use as administrator
2. In your code editor, open a secured view, for example, `src/ng-app/events/Events.view.html`
3. Place the following code somewhere in the body of the view: `<pre>{{events.user.uid}}</pre>`
4. In your browser, refresh the default route in your app `/` and if you're logged in, the code you added should be visible and will display your logged-in user's unique, persistent `UID`
5. Copy this `UID` and delete the code from the view
6. In your Firebase app, click **Data**
7. Mouse over the name of your app in the data editor and click the little green `+` to add keys/values
8. Enter `data` as the name (leave the value blank) and then click the `+` after the value field; this will add a child node
9. Enter `master` as the name, paste your copied `UID` into the value, and click **Add**
10. The app will now check the authenticated user's `UID` against the `master` to determine permissions

#### Security & Rules

Firebase provides back-end security which can be configured through their **Security & Rules** editor. 

For basic read/write security, paste the following into the **FIREBASE RULES** field under **Security & Rules** in your Firebase app settings, and click **SAVE RULES**:

```
{
  "rules": {
    ".read": true,
    "events": {
      ".write": "auth != null && root.child('data').child('master').val() === auth.uid",
      "$event": {
        ".validate": "newData.hasChildren(['title', 'startDate', 'startTime', 'endDate', 'endTime', 'location', 'viewPublic', 'rsvp'])"
      }
    },
    "rsvps": {
      "$rsvp": {
        ".write": "auth != null && (newData.child('userId').val() === auth.uid || root.child('data').child('master').val() === auth.uid)",
        ".validate": "newData.hasChildren(['name', 'userId', 'attending', 'eventId', 'eventName'])"
      }
    }
  }
}
```

**Important:** These are very basic rules and can/*should* be expanded. Please see Firebase's documentation on [Securing Your Data](https://www.firebase.com/docs/security/guide/securing-data.html) and [Security API](https://www.firebase.com/docs/security/api/) to learn more about writing your own database rules and validation.

## Future Enhancements

- [ ] Allow realtime commenting on events
- [ ] Allow users to subscribe to updates for events

## Changelog

* **v0.2.2** - 5/07/15: Bugs resolved, feature-complete for first release
* **v0.2.1** - 5/02/15: Device tested and most device-related bugs resolved
* **v0.2.0** - 5/01/15: Closed all priority bugs, deployed to shared hosting with Firebase backend
