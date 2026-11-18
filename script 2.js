/* FRAME. — TMDB-powered movie discovery.
   TMDB read token is entered by the visitor and stored in this browser only.
   A production/public commercial deployment should proxy TMDB requests through a backend. */
const TMDB_BASE="https://api.themoviedb.org/3";
const POSTER_BASE="https://image.tmdb.org/t/p/w500";
const TOKEN_KEY="frame_tmdb_read_token";
const GENRES={28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western"};
let activeMovies=[],activePage=1,activeKind="regular",lastAnswers=null;

function getToken(){return localStorage.getItem(TOKEN_KEY)||""}
function setStatus(text){document.querySelectorAll("#dbStatus").forEach(el=>el.textContent=text)}
function setupTokenUI(){
 const toggle=document.getElementById("toggleApi"),entry=document.getElementById("apiEntry"),field=document.getElementById("tmdbToken"),save=document.getElementById("saveToken"),clear=document.getElementById("clearToken");
 if(!toggle)return;
 if(getToken()){setStatus("TMDB is connected on this device. Live posters, ratings, descriptions and a large catalogue are ready.");toggle.textContent="Manage";if(field)field.value=getToken()}
 toggle.addEventListener("click",()=>{entry.hidden=!entry.hidden;});
 save?.addEventListener("click",()=>{const value=field.value.trim();if(!value){alert("Paste your TMDB Read Access Token first.");return}localStorage.setItem(TOKEN_KEY,value);setStatus("TMDB token saved on this device. Live movie discovery is ready.");toggle.textContent="Manage";entry.hidden=true;});
 clear?.addEventListener("click",()=>{localStorage.removeItem(TOKEN_KEY);if(field)field.value="";setStatus("TMDB disconnected. Add your token to load live movies.");});
}
async function tmdb(path,params={}){
 const token=getToken();if(!token)throw new Error("Add your TMDB Read Access Token in the Movie Database panel above.");
 const url=new URL(TMDB_BASE+path);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,v)});
 const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,accept:"application/json"}});
 if(!response.ok){if(response.status===401)throw new Error("TMDB did not accept that token. Check that you copied the API Read Access Token from your TMDB account.");if(response.status===429)throw new Error("TMDB is receiving too many requests. Please wait a moment and try again.");throw new Error(`Movie database request failed (${response.status}).`)}
 return response.json();
}
function posterURL(path){return path?POSTER_BASE+path:""}
function yearOf(m){return (m.release_date||"").slice(0,4)}
function movieCard(m){
 const title=m.title||m.original_title||"Untitled";
 const genres=(m.genre_ids||[]).map(id=>GENRES[id]).filter(Boolean).slice(0,2).join(" · ");
 const rating=Number(m.vote_average||0).toFixed(1);
 const poster=posterURL(m.poster_path);
 const overview=(m.overview||"No description is available for this title yet.").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const safeTitle=title.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 return `<article class="movie-card"><div class="poster-wrap">${poster?`<img loading="lazy" src="${poster}" alt="Poster for ${safeTitle}" onerror="this.remove()">`:""}<div class="poster-fallback">${safeTitle}</div><span class="movie-rating">★ ${rating}</span></div><div class="movie-info"><strong>${safeTitle}</strong><p class="movie-meta">${yearOf(m)||"Release year unavailable"}${genres?" · "+genres:""}</p><p class="movie-overview">${overview}</p><div class="movie-actions"><a href="https://www.themoviedb.org/movie/${m.id}" target="_blank" rel="noopener">Details ↗</a><button class="save-movie" data-save="${m.id}">＋ Watchlist</button></div></div></article>`;
}
function renderMovies(target,movies){target.innerHTML=movies.map(movieCard).join("");target.querySelectorAll("[data-save]").forEach(btn=>btn.addEventListener("click",()=>toggleWatchlist(btn,Number(btn.dataset.save))));}
function toggleWatchlist(btn,id){let saved=JSON.parse(localStorage.getItem("frame_watchlist")||"[]");if(saved.includes(id)){saved=saved.filter(x=>x!==id);btn.textContent="＋ Watchlist";btn.classList.remove("saved")}else{saved.push(id);btn.textContent="✓ Saved";btn.classList.add("saved")}localStorage.setItem("frame_watchlist",JSON.stringify(saved))}
function updateSavedButtons(target){const saved=JSON.parse(localStorage.getItem("frame_watchlist")||"[]");target.querySelectorAll("[data-save]").forEach(b=>{if(saved.includes(Number(b.dataset.save))){b.textContent="✓ Saved";b.classList.add("saved")}})}
function selected(form,name){return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value)}
function yearParams(era){const y=new Date().getFullYear();if(era==="recent")return {primary_release_date_gte:"2020-01-01"};if(era==="2010s")return {primary_release_date_gte:"2010-01-01",primary_release_date_lte:"2019-12-31"};if(era==="2000s")return {primary_release_date_gte:"2000-01-01",primary_release_date_lte:"2009-12-31"};if(era==="older")return {primary_release_date_lte:"1999-12-31"};return {}}
function moodGenre(mood){return {laugh:[35],romantic:[10749,35],edge:[53,9648],dark:[18,80,53,27],adventure:[12,28,14,878],"feel-good":[35,10751,16,12],thoughtful:[18,99,36]}[mood]||[]}
function runtimeParams(runtime){if(runtime==="short")return {"with_runtime.lte":89};if(runtime==="standard")return {"with_runtime.gte":90,"with_runtime.lte":120};if(runtime==="long")return {"with_runtime.gte":121};return {}}
async function discoverRegular(a,page=1){
 // Selected genres are hard filters. If none were selected, use the chosen mood's genres.
 // A movie outside the selected genre set is never allowed into the shortlist.
 const selectedGenres=a.genre.length?a.genre.map(Number):moodGenre(a.mood);
 const paramsBase={include_adult:"false",language:"en-US",sort_by:"popularity.desc",vote_count_gte:40,page,...yearParams(a.era),...runtimeParams(a.runtime)};
 if(selectedGenres.length)paramsBase.with_genres=selectedGenres.join("|");
 if(a.rating>0)paramsBase["vote_average.gte"]=a.rating;
 // Family/kids selections are age-suitability filters, not extra genres that can
 // accidentally override the participant's chosen genre.
 if(a.company==="kids"||a.company==="family"){
   paramsBase.certification_country="US";
   paramsBase["certification.lte"]="PG";
 }
 if(a.avoid.includes("horror"))paramsBase.without_genres="27";
 if(a.avoid.includes("foreign"))paramsBase.with_original_language="en";
 const data=await tmdb("/discover/movie",paramsBase);
 return (data.results||[])
   .filter(m=>m.poster_path)
   .filter(m=>!a.avoid.includes("horror")||!(m.genre_ids||[]).includes(27))
   .filter(m=>!a.avoid.includes("adult")||!m.adult)
   .filter(m=>!a.avoid.includes("foreign")||m.original_language==="en")
   .filter(m=>!selectedGenres.length||selectedGenres.some(g=>(m.genre_ids||[]).includes(g)))
   .map(m=>({...m,_match:scoreRegular(m,a)}));
}
function scoreRegular(m,a){
 const gs=m.genre_ids||[];let s=0;
 // Mood and company can improve ordering, but cannot bypass hard filters.
 if(moodGenre(a.mood).some(g=>gs.includes(g)))s+=3;
 if(a.rating&&m.vote_average>=a.rating)s+=2;
 if(a.company==="family"||a.company==="kids"){
   if(gs.includes(10751)||gs.includes(16))s+=3;
 }
 if(a.company==="date"||a.company==="partner"){
   if(gs.includes(10749))s+=3;
   if(gs.includes(35))s+=1;
 }
 if(a.company==="friends"&&gs.includes(35))s+=1;
 return s;
}
async function discoverHoliday(a,page=1){
 const config={
 halloween:{genres:"27,35,14,53",keywords:"",styles:["Scary horror","Not-too-scary spooky","Family-friendly","Horror comedy","Classic Halloween"]},
 christmas:{genres:"35,10751,10749,18,14",styles:["Cozy and feel-good","Romantic Christmas","Family favorites","Christmas comedy","Classic holiday films"]},
 valentines:{genres:"10749,35,18",styles:["Romantic","Rom-com","Date-night drama","Feel-good love story"]},
 july4:{genres:"28,12,35,36,10752",styles:["Summer adventure","Patriotic / historical","Action and excitement","Easy summer comedy"]},
 thanksgiving:{genres:"35,18,10751",styles:["Family gathering","Heartwarming","Food and friendship","Thankful and uplifting"]},
 newyear:{genres:"35,18,10749",styles:["New beginnings","Party and celebration","Romantic countdown","Fresh-start comedy"]},
 easter:{genres:"16,10751,12,35",styles:["Family-friendly","Springtime feel-good","Faith and inspiration","Adventure"]},
 stpatricks:{genres:"35,18,12",styles:["Irish stories","Irish comedy","Adventure","Feel-good"]}};
 const c=config[a.holiday];let genres=c.genres;
 if(a.style===0&&a.holiday==="halloween")genres="27,53";
 if(a.style===1&&a.holiday==="halloween")genres="35,14,53";
 if(a.style===2&&a.holiday==="halloween")genres="16,10751,14";
 if(a.style===0&&a.holiday==="christmas")genres="10749,18";
 if(a.style===2&&a.holiday==="christmas")genres="10751,16";
 if(a.company==="family")genres=[...new Set([...genres.split(","),"10751","16"])].join(",");
 const data=await tmdb("/discover/movie",{include_adult:"false",language:"en-US",sort_by:"popularity.desc",vote_count_gte:10,with_genres:genres,page});
 let results=(data.results||[]).filter(m=>m.poster_path);
 // Holiday keywords add useful seasonal signals; catalogue results are supplemented by curated searches.
 const queries={halloween:["Halloween","Hocus Pocus","The Addams Family","Trick 'r Treat"],christmas:["Christmas","The Holiday","Home Alone","Elf"],valentines:["Valentine","romance"],july4:["Independence Day","summer"],thanksgiving:["Thanksgiving","Planes Trains and Automobiles"],newyear:["New Year's Eve","The Apartment"],easter:["Easter","spring family"],stpatricks:["Irish","St. Patrick's Day"]};
 const extra=await Promise.all((queries[a.holiday]||[]).slice(0,3).map(q=>tmdb("/search/movie",{query:q,include_adult:"false",language:"en-US",page:1}).then(d=>d.results||[]).catch(()=>[])));
 const merged=new Map();[...results,...extra.flat()].filter(m=>m.poster_path).forEach(m=>{if(!merged.has(m.id))merged.set(m.id,m)});
 return [...merged.values()].map(m=>({...m,_match:holidayScore(m,a)}));
}
function holidayScore(m,a){const gs=m.genre_ids||[];let s=0;if(a.company==="family"&&(gs.includes(10751)||gs.includes(16)))s+=3;if(a.company==="date"&&gs.includes(10749))s+=2;if(a.vibe==="fun"&&gs.includes(35))s+=2;if(a.vibe==="spooky"&&(gs.includes(27)||gs.includes(53)))s+=3;if(a.vibe==="cozy"&&(gs.includes(10751)||gs.includes(10749)||gs.includes(18)))s+=2;return s}
function sortMovies(movies,sort){const arr=[...movies];if(sort==="rating")arr.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));else if(sort==="newest")arr.sort((a,b)=>(b.release_date||"").localeCompare(a.release_date||""));else arr.sort((a,b)=>(b._match||0)-(a._match||0)||(b.popularity||0)-(a.popularity||0));return arr}
function setupMovieSurvey(){
 const form=document.getElementById("movieSurvey");if(!form)return;
 const steps=[...form.querySelectorAll(".question-step")],prev=document.getElementById("prevBtn"),next=document.getElementById("nextBtn"),fill=document.getElementById("progressFill"),label=document.getElementById("progressLabel");let current=0;
 function show(){steps.forEach((s,i)=>s.classList.toggle("active",i===current));prev.disabled=current===0;next.innerHTML=current===steps.length-1?"Find my movies <span>→</span>":"Continue <span>→</span>";fill.style.width=((current+1)/steps.length*100)+"%";label.textContent=`QUESTION ${current+1} OF ${steps.length}`}
 function valid(){const step=steps[current];for(const input of step.querySelectorAll('input[required]'))if(input.type==="radio"&&!step.querySelector(`[name="${input.name}"]:checked`)){alert("Choose an option to continue.");return false}return true}
 async function finish(){const a={mood:selected(form,"mood")[0],genre:selected(form,"genre"),company:selected(form,"company")[0],runtime:selected(form,"runtime")[0],era:selected(form,"era")[0],rating:Number(selected(form,"rating")[0]||0),avoid:selected(form,"avoid")};lastAnswers=a;activeKind="regular";activePage=1;
 document.getElementById("results").hidden=false;form.hidden=true;document.querySelector(".progress-wrap").hidden=true;document.getElementById("results").scrollIntoView({behavior:"smooth"});
 try{if(!getToken())throw new Error("Connect TMDB above to load live movies. Add your TMDB Read Access Token, then retake the survey.");const movies=await discoverRegular(a,1);activeMovies=movies;document.getElementById("resultsIntro").textContent=`Your shortlist follows your selected genre${a.genre.length===1?"":"s"}, runtime, era, rating and avoid preferences. Mood and company help rank the closest matches. ${movies.length} matching titles found.`;renderMovieResults();}catch(e){document.getElementById("resultsIntro").textContent=e.message;document.getElementById("recommendations").innerHTML='<p class="empty-state">Once TMDB is connected, your personalized movie shortlist will appear here.</p>'}}
 next.addEventListener("click",()=>{if(!valid())return;if(current<steps.length-1){current++;show()}else finish()});prev.addEventListener("click",()=>{if(current>0){current--;show()}});document.getElementById("againBtn").addEventListener("click",()=>location.reload());
 document.getElementById("sortResults").addEventListener("change",renderMovieResults);document.getElementById("loadMore").addEventListener("click",async()=>{const b=document.getElementById("loadMore");b.disabled=true;b.textContent="Loading…";try{const more=await discoverRegular(lastAnswers,++activePage);activeMovies.push(...more);renderMovieResults()}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent="Load more movies"}});
 function renderMovieResults(){const sorted=sortMovies(activeMovies,document.getElementById("sortResults").value);renderMovies(document.getElementById("recommendations"),sorted);updateSavedButtons(document.getElementById("recommendations"));document.getElementById("resultCount").textContent=`${sorted.length} movies found`;document.getElementById("loadMore").hidden=activeMovies.length===0}
 show();
}
const holidayStyles={halloween:["Scary horror","Not-too-scary spooky","Family-friendly","Horror comedy","Classic Halloween"],christmas:["Cozy and feel-good","Romantic Christmas","Family favorites","Christmas comedy","Classic holiday films"],valentines:["Romantic","Rom-com","Date-night drama","Feel-good love story"],july4:["Summer adventure","Patriotic / historical","Action and excitement","Easy summer comedy"],thanksgiving:["Family gathering","Heartwarming","Food and friendship","Thankful and uplifting"],newyear:["New beginnings","Party and celebration","Romantic countdown","Fresh-start comedy"],easter:["Family-friendly","Springtime feel-good","Faith and inspiration","Adventure"],stpatricks:["Irish stories","Irish comedy","Adventure","Feel-good"]};
const holidayNames={halloween:"Halloween",christmas:"Christmas",valentines:"Valentine's Day",july4:"4th of July",thanksgiving:"Thanksgiving",newyear:"New Year's",easter:"Easter",stpatricks:"St. Patrick's Day"};
function setupHolidaySurvey(){
 const form=document.getElementById("holidaySurvey");if(!form)return;const steps=[...form.querySelectorAll(".question-step")],prev=document.getElementById("holidayPrev"),next=document.getElementById("holidayNext");let current=0;
 function show(){steps.forEach((s,i)=>s.classList.toggle("active",i===current));prev.disabled=current===0;next.innerHTML=current===steps.length-1?"Find holiday movies <span>→</span>":"Continue <span>→</span>"}
 function buildStyles(){const h=selected(form,"holiday")[0];document.getElementById("holidayStyles").innerHTML=(holidayStyles[h]||[]).map((s,i)=>`<label class="choice"><input type="radio" name="hstyle" value="${i}" required><span>${s}</span></label>`).join("")}
 form.querySelectorAll('[name="holiday"]').forEach(i=>i.addEventListener("change",buildStyles));
 async function finish(){const a={holiday:selected(form,"holiday")[0],style:Number(selected(form,"hstyle")[0]),company:selected(form,"hcompany")[0],vibe:selected(form,"hvibe")[0]};lastAnswers=a;activeKind="holiday";activePage=1;document.getElementById("holidayResults").hidden=false;form.hidden=true;document.getElementById("holidayResults").scrollIntoView({behavior:"smooth"});document.getElementById("holidayResultTitle").textContent=`Your ${holidayNames[a.holiday]} movie night.`;try{if(!getToken())throw new Error("Connect TMDB above to load live holiday movie posters and recommendations.");activeMovies=await discoverHoliday(a,1);document.getElementById("holidayIntro").textContent=`A seasonal shortlist shaped around your holiday, company and vibe.`;renderHolidayResults()}catch(e){document.getElementById("holidayIntro").textContent=e.message;document.getElementById("holidayRecommendations").innerHTML='<p class="empty-state">Connect TMDB to see your holiday movie shortlist here.</p>'}}
 next.addEventListener("click",()=>{if(current===0&&!selected(form,"holiday").length){alert("Choose a holiday to continue.");return}if(current===1&&!selected(form,"hstyle").length){alert("Choose a holiday movie style.");return}if(current===2&&!selected(form,"hcompany").length){alert("Choose who is watching.");return}if(current===3&&!selected(form,"hvibe").length){alert("Choose the kind of vibe you want.");return}if(current<steps.length-1){current++;show()}else finish()});
 prev.addEventListener("click",()=>{if(current>0){current--;show()}});document.getElementById("holidayAgain").addEventListener("click",()=>location.reload());document.getElementById("holidaySort").addEventListener("change",renderHolidayResults);document.getElementById("holidayMore").addEventListener("click",async()=>{const b=document.getElementById("holidayMore");b.disabled=true;b.textContent="Loading…";try{activeMovies.push(...await discoverHoliday(lastAnswers,++activePage));renderHolidayResults()}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent="Load more movies"}});
 function renderHolidayResults(){const sorted=sortMovies(activeMovies,document.getElementById("holidaySort").value);renderMovies(document.getElementById("holidayRecommendations"),sorted);updateSavedButtons(document.getElementById("holidayRecommendations"));document.getElementById("holidayCount").textContent=`${sorted.length} seasonal movie ideas`;document.getElementById("holidayMore").hidden=activeMovies.length===0}
 show();
}
setupTokenUI();setupMovieSurvey();setupHolidaySurvey();