function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
}

function hideLoader(el) {
    el.classList.add("load-complete");
    // listen for css3 transitions to finish and set element to display none.
    "webkitAnimationEnd oanimationend msAnimationEnd animationend".split(" ").forEach(function(e){
        el.addEventListener(e,function () {
            this.style.display = 'none';
        });
    });
}

window.fwbq = {
    answers: []
}

async function fetchSVGs(svgs){
    const filesnames = [], fnlc = []
    for(let i=0;i<svgs.length;i++){
        const match = /([^/]+)\.svg/i.exec(svgs[i].url)
        if(match && !fnlc.includes(match[1].toLowerCase())){
            filesnames.push(match[1])
            fnlc.push(match[1].toLowerCase())
        } else {
            filesnames.push('svg'+i)
            fnlc.push('svg'+i)
        }
    }
    const promises = svgs.map(s => fetch(s.url)), responses = await Promise.all(promises)
    const svgPaths = [], svgViewBoxes = [], svgFills = []
    for(let i=0;i<svgs.length;i++){
        const xml = await responses[i].text()
        let match = /<path[^>]+?>/i.exec(xml)
        if(match){
            let fill = /fill="([^"]+?)"/i.exec(match[0])
            if(fill) svgFills.push(fill[1])
            else svgFills.push('')
            svgPaths.push(match[0].replace(/fill="[^"]+"/gi,''))
        }
        else {
            svgFills.push('')
            svgPaths.push('')
        }
        match = /viewBox="([^"]+?)"/i.exec(xml)
        if(match) svgViewBoxes.push(match[1])
        else svgViewBoxes.push('')
    }
    const result = {}
    for(let i=0;i<svgs.length;i++){
        result[filesnames[i]] = Object.assign(
            svgs[i],
            {path: svgPaths[i], viewBox: svgViewBoxes[i], fill: svgFills[i]}
        )
    }
    return result
}

async function buildHTML(config){
    window.fwbq.svgs = await fetchSVGs(config.svgs);
    config = window.fwbq
    const svgDefs = `
        <svg class="defs-only" xmlns="http://www.w3.org/2000/svg">
            ${(function(svgs){
                return Object.keys(svgs).reduce((result, id, i) => {
                    return result + `
                        <symbol id="${id}">
                            ${config.svgs[id].path}
                        </symbol>
                    `
                },'')
            })(config.svgs)}
        </svg>
    `
    const titleSlide = `
        <div>${config.title}</div>
        <div class="fwbq-intro-text">${config.intro}</div>
        <div><a href="#" class="fwbq-btn">${config.start}</a></div>
    `
    const resultSlide = `
        <div class="fwbq-result-cols">
            <div id="fwbq-result-result-col" class="fwbq-result-col">
                <h1 id="fwbq-result-intro">Your result:</h1>
                <h1 id="fwbq-result-title" class="fwbq-highlight"></h1>
                <h1 id="fwbq-result-subtitle"></h1>
                <div class="fwbq-result-scores">
                    <div class="fwbq-result-score">
                        <p class="fwbq-result-score-label">Security score</p>
                        <div class="fwbq-result-score-content">
                            <p class="fwbq-result-score-desc">This is how secure you've told us you may be, financially:</p>
                            <h2 id="fwbq-security-score" class="fwbq-score">0<sup>%</sup></h2>
                        </div>
                    </div>
                    <div class="fwbq-result-score">
                        <p class="fwbq-result-score-label">Confidence score</p>
                        <div class="fwbq-result-score-content">
                            <p class="fwbq-result-score-desc">This is how financially confident you've told us you may be:</p>
                            <h2 id="fwbq-confidence-score" class="fwbq-score">0<sup>%</sup></h2>
                        </div>
                    </div>
                </div>
                <div><a href="https://experience200.ehr.com/LifeSightfinancialwellbeing/" id="fwbq-result-btn" class="fwbq-btn">What you can do...</a></div>
            </div>
            <div id="fwbq-result-aside-col" class="fwbq-result-col">
                <div id="fwbq-result-aside">
                    <h3>Remember...</h3>
                    <p>Money relationships develop over years from habits and experience; they can be pretty complex!</p>
                    <p>So, while we can't possibly know all about you from the answers to nine short questions, we hope your results offer some helpful steps to exploring your money relationship further.</p>
                    <p>And remember, we're not providing financial advice and our suggestions are just that — suggestions — so please use them as a guide only.</p>
                </div>
            </div>
        </div>
        <div class="fwbq-prev"><a href="#">${config.previous}</a></div>
    `
    const slides = []
    const highlightColors = {
        "#fbc659":["#fde3ac"],
        "#89f695":["#6cf47b"],
        "#ec8eb9":["#ec8eb9"]
    }
    
    // Build list of colors to use
    for(q of config.questions){
        if(q.bullet && !(q.bullet in highlightColors)) highlightColors[q.bullet] = []
        if(q.highlightColor){
            if(!q.bullet){
                for (b in highlightColors){
                    if(highlightColors[b].includes(q.highlightColor)){
                        q.bullet = b
                        break
                    }
                }
                if(!q.bullet){
                    q.bullet = q.highlightColor
                    highlightColors[q.highlightColor] = [q.highlightColor]
                }
            } else if(!highlightColors[q.bullet].includes(q.highlightColor)) {
                highlightColors[q.bullet].push(q.highlightColor)
            }
        }
    }
    for (b in highlightColors){
        if(highlightColors[b].length < 1){
            highlightColors[b] = [b]
        }
    }

    for(q of config.questions){
        if(q.highlight === undefined) q.highlight = 'hover';
        if(!q.bullet || (q.highlight && !q.highlightColor)){
            let i = Math.floor(Math.random()*Object.keys(highlightColors).length)
            q.bullet = q.bullet || Object.keys(highlightColors)[i]
            q.highlightColor = q.highlightColor || highlightColors[q.bullet][Math.floor(Math.random()*highlightColors[q.bullet].length)]
        }
        slides.push(`
            <h2 class="fwbq-question">${q.question}</h2>
            <ul class="fwbq-options">
                ${(function(qn) {
                    return qn.options.reduce((result, opt, i) => {
                        return result + `
                            <li>
                                <svg class="fwbq-highlight-bullet" viewBox="0 0 17 14" width="17" height="14">
                                    <use xlink:href="#bullet" fill="${qn.bullet}"></use>
                                </svg>
                                <a href="#" class="${qn.highlight ? 'fwbq-highlight'+(qn.highlight=='hover' ? '-on-hover' : '') : ''}" data-highlight-color="${qn.highlightColor}" data-option="${i}">
                                    ${opt.option.replace(/\[([^\]]+)\]/g,'<span class="fwbq-highlight-text">$1</span>')}
                                </a>
                            </li>
                        `
                    },'')
                })(q)}
            </ul>
            <div class="fwbq-prev"><a href="#">${config.previous}</a></div>
            <div class="fwbq-tooltip">
                <div class="fwbq-tooltip-content">${q.tooltip}</div>
                <a href="#" class="fwbq-highlight-on-hover" data-highlight-color="${config.tooltipHighlightColor}">
                    <span class="fwbq-highlight-text" data-highlight="marker2">${config.tooltip}</span>
                </a>
            </div>
        `)
    }
    return `
        ${svgDefs}
        <div id="fwbq-top" style="opacity: 0;">
            <div id="fwbq-complete">0% complete</div>
            <div id="fwbq-restart"><a href="#">Start again</a></div>
        </div>
        <div id="fwbq-progress">
            <div id="fwbq-progress-bar" style="width: 0%;"></div>
        </div>
        <div class="swiper">
            <div id="fwbq-slides" class="swiper-wrapper">
                <div class="swiper-slide" id="fwbq-slide-0">
                    ${titleSlide}
                </div>
                ${(function(arr){
                    return arr.reduce((result, slideHtml, i) => {
                        return result + `
                            <div class="swiper-slide" id="fwbq-slide-${i+1}" data-question="${i+1}">
                                ${slideHtml}
                            </div>
                        `
                    },'')
                })(slides)}
                <div class="swiper-slide" id="fwbq-slide-result">
                    ${resultSlide}
                </div>
            </div>
        </div>
    `
}

function setResult(config){
    const maxScore = config.questions.reduce((scores,q,i)=>{
        let max = [0,0]
        for(opt of q.options){
            if(opt.scores[0] > max[0]) max[0]=opt.scores[0]
            if(opt.scores[1] > max[1]) max[1]=opt.scores[1]
        }
        return [scores[0]+max[0],scores[1]+max[1]]
    },[0,0])
    const finalScore = config.answers.reduce((scores,opt,i)=>{
        if(!Array.isArray(opt)) opt = [opt]
        for(o of opt){
            scores[0] += config.questions[i].options[o].scores[0]
            scores[1] += config.questions[i].options[o].scores[1]
        }
        return scores
    },[0,0])
    const pcs = [
        Math.round(finalScore[0]/maxScore[0]*100),
        Math.round(finalScore[1]/maxScore[1]*100)
    ]
    let result
    for(r of config.results){
        if(pcs[0]>=r.scores[0] && pcs[1]>=r.scores[1]) result = r
    }
    document.getElementById('fwbq-result-title').innerHTML = `<span class=\"fwbq-highlight-text\" data-highlight=\"marker10\">${result.title}</span>`
    createHighlightSvg(config,document.getElementById('fwbq-result-title'))
    setHighlightSvgTransform(config,document.getElementById('fwbq-result-title'))
    document.getElementById('fwbq-result-subtitle').innerHTML = result.subtitle
    document.getElementById('fwbq-security-score').innerHTML = pcs[0]+'<sup>%</sup>'
    document.getElementById('fwbq-confidence-score').innerHTML = pcs[1]+'<sup>%</sup>'
    document.getElementById('fwbq-result-btn').href = result.link
}

function createHighlightSvg(config,el){
    if(!el.querySelector('.fwbq-highlight-text-wrapper')){
        el.innerHTML = `
            <span class="fwbq-highlight-text-wrapper">
                ${el.innerHTML}
            </span>
        `
    }
    const svgIds = Object.keys(config.svgs).filter(id => !(['bullet','checkmark']).includes(id)),
        pick = function(arr){ return arr[Math.floor(Math.random()*arr.length)] },
        txts = el.querySelectorAll('.fwbq-highlight-text'),
        markers = el.querySelectorAll('.fwbq-highlight-marker')
    for(marker of markers) marker.remove()
    for(let i=txts.length-1;i>=0;i--){
        let markerId = txts[i].dataset.highlight
        if(!markerId){
            markerId = pick(svgIds ? svgIds : ['marker1'])
            txts[i].setAttribute('data-highlight',markerId)
        }
        let marker = `
            <svg class="fwbq-highlight-marker fwbq-highlight-${markerId}" ${config.svgs[markerId].viewBox ? 'viewBox="'+config.svgs[markerId].viewBox+'"' : ''}">
                <use xlink:href="#${markerId}" fill="${el.dataset.highlightColor ? el.dataset.highlightColor : '#ffb5eb'}" />
            </svg>
        `
        el.insertAdjacentHTML('afterbegin',marker)
    }
}

function setHighlightSvgTransform(config, el){
    const txts = el.querySelectorAll('.fwbq-highlight-text'), svgs = el.querySelectorAll('.fwbq-highlight-marker')
    for(let i=0; i<txts.length;i++){
        let markerId = txts[i].dataset.highlight
        if(!markerId){
            markerId = svgs[i].querySelector('use').getAttribute('xlink:href').replace(/^#/,'')
            txts[i].setAttribute('data-highlight',markerId)
        }
        let offsetLeft = parseFloat(config.svgs[markerId].left ? config.svgs[markerId].left : 0),
            offsetTop = parseFloat(config.svgs[markerId].top ? config.svgs[markerId].top : 0),
            scaleWidth = parseFloat(config.svgs[markerId].width ? config.svgs[markerId].width : 1),
            scaleHeight = parseFloat(config.svgs[markerId].height ? config.svgs[markerId].height : 1)
        svgs[i].removeAttribute('style')
        const svgRect = svgs[i].getBoundingClientRect(), txtRect = txts[i].getBoundingClientRect();
        if(/%$/.test(config.svgs[markerId].left)) offsetLeft = (offsetLeft/100)*txtRect.width
        if(/%$/.test(config.svgs[markerId].top)) offsetTop = (offsetTop/100)*txtRect.height
        if(/%$/.test(config.svgs[markerId].width)) scaleWidth = scaleWidth/100
        if(/%$/.test(config.svgs[markerId].height)) scaleHeight = scaleHeight/100
        const scaleX = (txtRect.width/svgRect.width)*scaleWidth,
            scaleY = (txtRect.height/svgRect.height)*scaleHeight,
            transateX = txtRect.left-svgRect.left+offsetLeft,
            transateY = txtRect.top-svgRect.top+offsetTop;
        svgs[i].style.transformOrigin = "0 0"
        svgs[i].style.transform = "translate("+transateX+"px, "+transateY+"px) scale("+scaleX+", "+scaleY+")"
    }
}

ready(async function(){
    // Fetch config
    const response = await fetch('./static/LIF/fwbq.json')
    let config = await response.json();
    window.fwbq = Object.assign(window.fwbq, config)
    config = window.fwbq

    // Insert html
    const html = await buildHTML(config);
    document.getElementById('fwbq').innerHTML = html;

    // Create slider
    let currentSlide = 0
    const swiper = new Swiper('#fwbq .swiper', {
        spaceBetween: 0,
        speed: 300,
        allowTouchMove: false,
        //autoHeight: true,
        centeredSlides: true,
        simulateTouch: false,
        keyboard: false,
        effect: 'fade',
        fadeEffect: {
          crossFade: true
        },
        on: {
            beforeTransitionStart: function(){
                // console.log('beforeTransitionStart')
                Array.from(document.querySelectorAll('.swiper-slide.hidden')).forEach(s => s.classList.remove('hidden'))
            },
            transitionEnd: function(){
                // console.log('transitionEnd')
                Array.from(document.querySelectorAll('.swiper-slide')).forEach(s => { if(!s.classList.contains('swiper-slide-active')) s.classList.add('hidden'); })
            },
            slideChange: function() {
                // console.log('slideChange')
                // Last ditch attempt to avoid tab-key issues
                if(swiper.activeIndex != currentSlide) setTimeout(function(){swiper.slideTo(currentSlide)},50)
            }
        }
    });

    // Highlights
    Array.from(document.querySelectorAll('.fwbq-highlight,.fwbq-highlight-on-hover')).map(el => {
        createHighlightSvg(config,el)
    })
    const setHighlightSvgTransforms = function(){
        Array.from(document.querySelectorAll('.fwbq-highlight,.fwbq-highlight-on-hover')).map(el => {
            setHighlightSvgTransform(config, el)
        })
    }
    setHighlightSvgTransforms()

    // Setup / parse local storage
    const storedStr = window.localStorage.getItem('fwbq'), storage = {version:'1.0.0',timestamp:Date.now(),answers:[]}
    if(storedStr){
        let parsedObj
        try {
            parsedObj = JSON.parse(storedStr)
        } catch(e){
            parsedObj = false
        }
        if(parsedObj && typeof parsedObj == 'object' && !Array.isArray(parsedObj)){
            if(parsedObj.answers && Array.isArray(parsedObj.answers) && parsedObj.answers.length > 0){
                while(
                    typeof parsedObj.answers[parsedObj.answers.length-1] == 'undefined' ||
                    parsedObj.answers[parsedObj.answers.length-1] === null ||
                    (Array.isArray(parsedObj.answers[parsedObj.answers.length-1]) && parsedObj.answers[parsedObj.answers.length-1].length < 1)
                ){
                    parsedObj.answers.pop()
                }
                if(
                    parsedObj.answers.length <= config.questions.length
                    && parsedObj.answers.every((e,i) => {
                        if(!Array.isArray(e)) e = [e]
                        return e.length < 1 ? false : e.every((n,j) => typeof n == 'number' && n >=0 && n == Math.floor(n) && n < config.questions[i].options.length)
                    })
                    && parsedObj.version && typeof parsedObj.version == 'string' && /^v?\d{1,3}\.\d{1,3}(\.\d{1,3})?(\-[A-z0-9]{1,3})?$/.test(parsedObj.version)
                    && parsedObj.timestamp && typeof parsedObj.timestamp == 'number' && parsedObj.timestamp > Date.UTC(2022, 10, 1) && parsedObj.timestamp < Date.now()+1000*60*5
                ){
                    if(parsedObj.version == '1.0.0'){
                        storage.answers = parsedObj.answers
                        storage.version = parsedObj.version
                        storage.timestamp = Math.min(parsedObj.timestamp,storage.timestamp)
                    } // else ... handle other versions in future
                }
            }
        }
    }
    window.localStorage.setItem('fwbq',JSON.stringify(storage))
    window.fwbq.answers = storage.answers
    if(storage.answers.length > 0){
        // Set selected
        const qEls = document.querySelectorAll('#fwbq-slides .swiper-slide')
        for(let qIdx=0; qIdx<storage.answers.length;qIdx++){
            const multiple = parseInt(config.questions[qIdx].multiple ? config.questions[qIdx].multiple : 1)
            if(multiple > 1){
                const aEls = qEls[i].querySelectorAll('[data-option]'), bullets = Array.from(aEls).map(a => a.parentElement.querySelector('.fwbq-highlight-bullet'))
                for(i of Array.isArray(storage.answers[qIdx]) ? storage.answers[qIdx] : [storage.answers[qIdx]]){
                    bullets[i].setAttribute('viewBox',config.svgs['checkmark'].viewBox)
                    bullets[i].querySelector('use').setAttribute('xlink:href','#checkmark')
                    bullets[i].querySelector('use').setAttribute('fill',config.svgs['checkmark'].fill ? config.svgs['checkmark'].fill : 'green')
                }
            }
        }
        // Set progress bar
        currentSlide = storage.answers.length+1
        const bar = document.querySelector('#fwbq-progress-bar'),
            p = Math.max(0,Math.min((currentSlide-1)/(swiper.slides.length-2),1)),
            pr = Math.round(p*100)
        document.querySelector('#fwbq-complete').innerText = pr+'% complete'
        document.querySelector('#fwbq-top').style.opacity = 1
        bar.style.width = (p*100)+"%"
        // If last screen, set result
        if(currentSlide == swiper.slides.length-1) setResult(window.fwbq)
        // Go to slide
        swiper.slideTo(currentSlide)
    }
    let updateStorageAnswer = function(q,a){
        if(storage.answers.length < q+1){
            storage.answers = storage.answers.concat(new Array(q+1-storage.answers.length))
        }
        storage.answers[q] = a
        storage.timestamp = Date.now()
        window.localStorage.setItem('fwbq',JSON.stringify(storage))
    }

    // Restart click handler
    document.querySelector('#fwbq-restart').addEventListener('click', function(e){
        e.preventDefault()
        // Unselect choices
        for(u of document.querySelectorAll('.fwbq-highlight-bullet [*|href="#checkmark"]')){
            const qEl = u.closest('[data-question]'), qIdx = Math.max(0,parseInt(qEl.dataset.question)-1)
            u.closest('svg').setAttribute('viewBox',config.svgs['bullet'].viewBox ? config.svgs['bullet'].viewBox : '')
            u.setAttribute('xlink:href','#bullet')
            u.setAttribute('fill',config.questions[qIdx].bullet)
        }
        // Reset progress
        const bar = document.querySelector('#fwbq-progress-bar')
        document.querySelector('#fwbq-complete').innerText = '0% complete'
        document.querySelector('#fwbq-top').style.opacity = 0
        bar.style.width = "0%"
        currentSlide = 0
        config.answers = Array(config.questions.length)
        storage.answers = []
        storage.timestamp = Date.now()
        window.localStorage.setItem('fwbq',JSON.stringify(storage))
        swiper.slideTo(currentSlide)
    })
    // Start click handler
    document.querySelector('#fwbq-slide-0 .fwbq-btn').addEventListener('click', function(e){
        e.preventDefault()
        currentSlide = 1
        const bar = document.querySelector('#fwbq-progress-bar'),
            p = Math.max(0,Math.min((currentSlide-1)/(swiper.slides.length-2),1)),
            pr = Math.round(p*100)
        document.querySelector('#fwbq-complete').innerText = pr+'% complete'
        document.querySelector('#fwbq-top').style.opacity = 1
        bar.style.width = (p*100)+"%"
        swiper.slideTo(1)
    })
    // Other click handlers
    let lastIdx = -1, togglesInARow  = 0
    document.getElementById('fwbq').addEventListener('click', (e) => {
        // Option
        if (e.target.closest('.fwbq-options a')) {
            e.preventDefault()
            // Get click question and answer
            const qEl = e.target.closest('[data-question]'), aEl = e.target.closest('[data-option]')
            if(qEl && aEl){
                // Get index of clicked question and answer
                const qIdx = Math.max(0,parseInt(qEl.dataset.question)-1),
                    aIdx = parseInt(aEl.dataset.option),
                    multiple = parseInt(config.questions[qIdx].multiple ? config.questions[qIdx].multiple : 1)
                if(!config.questions[qIdx]) qIdx = swiper.activeIndex - 1
                // Ensure answers array is long enough
                if(config.answers.length < qIdx+1) config.answers = config.answers.concat(Array(qIdx+1-config.answers.length))
                let goToNext = false
                // Check if this is a question where multiple answers are needed
                if(multiple>1){
                    const selected = qEl.querySelectorAll('[*|href="#checkmark"]'),
                        bullet = aEl.parentElement.querySelector('.fwbq-highlight-bullet'),
                        isSelected = !!bullet.querySelector('[*|href="#checkmark"]')
                        // Check if help message should be shown
                        if(lastIdx==aIdx){
                            if(togglesInARow++ > 5) {
                                if(selected.length == multiple) alert('You already have '+multiple+' answers selected for this question. Deselect an answer first if you wish to change your selection.')
                                else alert('You need to select '+multiple+' answers for this question.')
                                togglesInARow = 0
                            }
                        } else {
                            lastIdx = aIdx
                            togglesInARow = 1;
                        }
                        if(isSelected){
                            // Unselect
                            bullet.setAttribute('viewBox',config.svgs['bullet'].viewBox ? config.svgs['bullet'].viewBox : '')
                            bullet.querySelector('use').setAttribute('xlink:href','#bullet')
                            bullet.querySelector('use').setAttribute('fill',config.questions[qIdx].bullet)
                        } else if(selected.length <= multiple - 1){
                            // Select
                            bullet.setAttribute('viewBox',config.svgs['checkmark'].viewBox)
                            bullet.querySelector('use').setAttribute('xlink:href','#checkmark')
                            bullet.querySelector('use').setAttribute('fill',config.svgs['checkmark'].fill ? config.svgs['checkmark'].fill : 'green')
                            if(selected.length == multiple - 1) goToNext = true
                        }
                        let selectedAns = Array.from(qEl.querySelectorAll('[*|href="#checkmark"]')).map(u => parseInt(u.closest('li').querySelector('[data-option]').dataset.option))
                        window.fwbq.answers[qIdx] = selectedAns
                        updateStorageAnswer(qIdx,selectedAns)
                } else {
                    // If not multiple, just save index and move on
                    window.fwbq.answers[qIdx] = [aIdx]
                    updateStorageAnswer(qIdx,aIdx)
                    goToNext = true
                }
                if(goToNext){
                    lastIdx = -1
                    togglesInARow  = 0
                    const csb = currentSlide
                    try {
                        currentSlide = Math.max(0,Math.min(currentSlide+1,swiper.slides.length-1))
                        const bar = document.querySelector('#fwbq-progress-bar'),
                            p = Math.max(0,Math.min((currentSlide-1)/(swiper.slides.length-2),1)),
                            pr = Math.round(p*100)
                        document.querySelector('#fwbq-complete').innerText = pr+'% complete'
                        document.querySelector('#fwbq-top').style.opacity = 1
                        bar.style.width = (p*100)+"%"
                        if(currentSlide == swiper.slides.length-1){
                            // Reached end
                            setResult(window.fwbq)
                        }
                        swiper.slideNext()
                    } catch(e){
                        console.error(e)
                        currentSlide = csb
                    }
                }
            }
        }
        // Previous
        else if (e.target.closest('.fwbq-prev a')) {
            e.preventDefault()
            const csb = currentSlide
            try {
                // Unselect choices on leaving slide
                const qEl = e.target.closest('[data-question]'), qIdx = qEl ? Math.max(0,parseInt(qEl.dataset.question)-1) : swiper.slides.length-1
                if(qEl){
                    for(u of e.target.closest('.swiper-slide').querySelectorAll('.fwbq-highlight-bullet [*|href="#checkmark"]')){
                        u.closest('svg').setAttribute('viewBox',config.svgs['bullet'].viewBox ? config.svgs['bullet'].viewBox : '')
                        u.setAttribute('xlink:href','#bullet')
                        u.setAttribute('fill',config.questions[qIdx].bullet)
                    }
                    window.fwbq.answers[qIdx] = []
                    updateStorageAnswer(qIdx,undefined)
                    lastIdx = -1
                    togglesInARow  = 0
                }
                // Update to new slide
                currentSlide = Math.max(0,Math.min(currentSlide-1,swiper.slides.length-1))
                // Set progress bar and go to prev slide
                const bar = document.querySelector('#fwbq-progress-bar'),
                    p = Math.max(0,Math.min((currentSlide-1)/(swiper.slides.length-2),1)),
                    pr = Math.round(p*100)
                if(currentSlide == 0) document.querySelector('#fwbq-restart').click()
                else {
                    document.querySelector('#fwbq-complete').innerText = pr+'% complete'
                    document.querySelector('#fwbq-top').style.opacity = 1
                    bar.style.width = (p*100)+"%"
                    swiper.slidePrev()
                }
            } catch(e){
                console.error(e)
                currentSlide = csb
            }
        }
        // Tooltip
        else if (e.target.closest('.fwbq-tooltip a')) {
            e.preventDefault()
            e.target.closest('.fwbq-tooltip').querySelector('.fwbq-tooltip-content').classList.toggle('show-tooltip')
        }
    })

    // Hover event
    document.getElementById('fwbq').addEventListener('mouseenter', (e) => {
        if(e.target.closest('.fwbq-tooltip') && e.target.tagName == 'A'){
            e.target.classList.add('hover')
            e.target.closest('.fwbq-tooltip').querySelector('.fwbq-tooltip-content').classList.add('show-tooltip')
        }
    }, true)
    document.getElementById('fwbq').addEventListener('mouseleave', (e) => {
        if(e.target.classList.contains('fwbq-tooltip')){
            e.target.querySelector('a').classList.remove('hover')
            e.target.querySelector('.fwbq-tooltip-content').classList.remove('show-tooltip')
        }
    }, true)

    // Resize event (devtools swiper bugfix, and re-calcualte SVG transforms)
    window.addEventListener('resize', function(){
        setTimeout(function(){
            document.querySelector('.swiper-slide-active').querySelector('a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])').focus()
            swiper.slideReset()
            setTimeout(function(){
                if(swiper.activeIndex != currentSlide) swiper.slideTo(currentSlide)
            },50)
            setHighlightSvgTransforms()
        },10)
    });

    // Ok, hide spinner
    hideLoader(document.getElementById('pageLoading'))
})