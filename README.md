# National Geographic: Photo of the Day

## About

Everyday, National Geographic is awesome enough to upload a new hand picked photo of something amazing in the world to their website. You can see these photos at:
http://photography.nationalgeographic.com/photography/photo-of-the-day/

This package allows for the easy scraping of these images from National Geographic. The data scraped comes with extra meta data such as the name of the photo, date of publish, description and author.

Obviously, National Geographic is a free nonprofit, so please use this package with care. Keep in mind that this package is only for personal use - don't go hosting National Geographic photos without their express permission!

## How to use

### Setup

#### Prerequisites

- Node installed
- Npm installed
- Gulp installed globally

#### Compile the Javascript

1. Pull down the repo using Git
2. Open a terminal and CD to where you downloaded the repo
3. Run `npm install`
4. Run `gulp` to compile the TypeScript

### Basic usage

```javascript
var natGeo = require('path/to/potd.js');

var potd = new natGeo.photoOfTheDay();

// Scrape photo data from http://photography.nationalgeographic.com/photography/photo-of-the-day/.
potd.getDataFromPage(function(data) {
    console.log(data);
});
```

### Todo

- [x] Make github repo
- [x] Fix typing file for TypeScript (.d.ts)
- [ ] Separate out interfaces and classes
- [ ] Publish NPM package.
- [ ] Build REST API