What is Scarlet?
==

Scarlet is a Content Management System built with Django. Scarlet adopts many
of the conventions of the Django Admin and extends them to enable a superset of
functionality. There are however some trade offs with using Scarlet; Postgres
9.1+ is the only supported RDBM.

If you'd like to contribute here how to set up development a dev environment:

https://bitbucket.org/markmiscavage/scarlet_demo/src/develop/docs/developer_setup.rst


Cool Stuff
==

* Versioning - Sophisticated versioning is included right out of the box.

* Caching - Expire your pages when the content changes, not based on some some
arbitrary time interval. Intelligently invalidate the cache for groups of
related objects (for example, when you publish a new article, the cache for
both the homepage and the article list page can automatically invalidate.)

* Content Scheduling - Schedule when you want you content to go live. Schedule
different versions of a piece of content to go live on different days.

* Asset Manager - Scarlet includes a powerful Asset management tool that can
automatically organize, tag, and resize images and other types of assets.

Installation
==

Scarlet depends on *Pillow* >= 2.7.0. This is not included as a requirement in
setup.py as Pillow's installation is better managed by the target system's
package manager.

Once Pillow is installed, Scarlet can be installed via *pip*.

    pip install scarlet

Usage
==

This project runs with Node.js 8.x. [Node Version Manager](https://github.com/nvm-sh/nvm  ) allows developers to switch from one node.js version to another :

```
  nvm use
```

Then, simply run the following :

```
  npm install
```
Which installs all necessary packages for front-end part.

For usage as static generated css/js run:
```
  npm run build
```

To make changes and generate css/js files after save run:
```
  npm run start
```
Before you push to PR run:
```
  npm run buildProd
```

To test and lint run:
```
  npm run lint
  npm run test
```
