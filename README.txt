FRAME. — Upgraded movie discovery starter

WHAT'S INCLUDED
- index.html: cinematic, minimal homepage
- finder.html: 7-step general movie survey
- holiday.html: separate holiday survey with 8 seasonal occasions
- styles.css: shared responsive styling
- script.js: TMDB-powered discovery, sorting, pagination, and browser watchlist

LIVE MOVIE CATALOGUE
This version connects to The Movie Database (TMDB) so the surveys can retrieve a broad and continually updated catalogue, including poster artwork, overviews, release years, genres and community ratings. The amount of available titles is much larger than a hand-written sample list. Visitors can load additional pages of results.

SET UP TMDB (one time per browser)
1. Create/sign in to a TMDB account: https://www.themoviedb.org/
2. Open account Settings → API and request an API Read Access Token.
3. Open the FRAME. Movie Finder or Holiday Finder page.
4. In the Movie Database panel, click Set up and paste the API Read Access Token.
5. Click Save on this device. The token is stored in that browser's localStorage and is NOT included in the website files or committed to GitHub.
6. Return to the survey and complete it. Both survey pages use the same token on the same browser.

IMPORTANT TOKEN SECURITY
GitHub Pages is a static host. A token used by browser-side JavaScript can be inspected by a technically capable visitor, even if it is stored in localStorage rather than committed to GitHub. This is suitable for a personal prototype/testing project, but not ideal for a public commercial service. For a production launch, route API requests through a backend/serverless function and keep the token secret there. Never paste your token into script.js or commit it to GitHub.

TMDB ATTRIBUTION
This product uses the TMDB API but is not endorsed or certified by TMDB.
Review TMDB's current terms and attribution requirements before publishing, especially if the site becomes commercial.

UPLOAD TO GITHUB PAGES
1. Download and unzip this folder.
2. Open your frame-movie-night repository.
3. Upload all five files to the repository root, replacing the existing index.html, finder.html, holiday.html, styles.css and script.js.
4. Commit changes to main.
5. Keep GitHub Pages configured to deploy from main / (root).

The recommendation matching is a first-pass heuristic based on survey choices and TMDB genre, release, rating and popularity data. Some subjective details (such as holiday themes, tone, age suitability and exact runtime) are not perfectly captured by genre metadata; the holiday page combines genre discovery with targeted title searches. We can refine these rules and add age-rating, language, streaming-provider and watchlist pages in a later iteration.
