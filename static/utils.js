// UTILS

function $(id) { return document.getElementById(id); }
function epoch()    { return (new Date()).getTime(); }
function epoch04h() { return epoch() - (1000*60*60*4); }
function epoch12h() { return epoch() - (1000*60*60*12); }
function epoch24h() { return epoch() - (1000*60*60*24); }
function epoch08d() { return epoch() - (1000*60*60*24*8); }
function epoch48d() { return epoch() - (1000*60*60*24*48); }
function isNumber(n){ return !isNaN(parseFloat(n)) && isFinite(n); }
function numberFrom(text){ return (parseFloat(stripCommas(text)) || 0); }
function countDecs(num) { return num.split('.')[1] ? num.split('.')[1].length : 0; }
function pretty(json) { return JSON.stringify(json, null, 4); }
function range(n) { return Array(n).fill(0).map((x,y)=>y); }

function random(n, m) { 
    if(!m){ m=n; n=0; } 
    var q = m-n;
    return n + parseInt(Math.random(q) * q);
}

function notyet() {
	alert('Not implemented yet. Try again in a couple of days');
	return false;
}

function trimEnd(text, char){
	text = String(text);
	while (text.slice(-1) == char){ text = text.slice(0, -1) }
	return text;
}

function getAssetCode(asset) {
	return asset.asset_type=='native' ? 'XLM' : asset.asset_code;
}

function getDate(time) {
	var date = new Date(time);
	if(!date){ return '01 Ene 00:00:00'; }
	var mm = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dec'][date.getMonth()];
	var dy = date.getDate();
	var dd = (dy<10 ? '0'+dy : dy);
	// time = (''+date).substr(16,8)
	var hr = date.getHours();
	var hh = (hr<10 ? '0'+hr : hr);
	var mt = date.getMinutes();
	var mi = (mt<10 ? '0'+mt : mt);
	var sc = date.getSeconds();
	var ss = (sc<10 ? '0'+sc : sc);
	var text = dd+' '+mm+' '+hh+':'+mi+':'+ss;
	return text;
}

function money(text, dec=4, comma=true, dimdec=false, blankZero=false) {
	if(text==''){ return blankZero?'':(0).toFixed(dec); }
	var num = 0;
	if(comma){
		num = parseFloat(text).toLocaleString("en", {minimumFractionDigits: dec, maximumFractionDigits: dec});
	} else {
		num = parseFloat(text).toFixed(dec);
	}
	if(dimdec && dec>0){
		var parts = num.split('.');
		num = parts[0] + '<dec>.' + parts[1]+ '</dec>';
	}
	return num;
}

function priceFraction(price, reversed=false) {
    var ndecs       = countDecs(trimEnd(''+price,'0'));
    var ntens       = Math.pow(10,ndecs);
    var numerator   = 1 * ntens;
    var denominator = price * ntens;
    var fraction    = {n:numerator, d:denominator};
    if(reversed) { fraction = {d:numerator, n:denominator}; }
    return fraction;
}

function stripCommas(value) {
	if(state.thousand==','){ return value.replace(/\,/g,''); }
	if(state.thousand=='.'){ return value.replace(/\./g,''); }
	return value;
}

function sortTable(event, col, type) {
	// Ordering types are 0.str 1.int 2.dbl 3.date
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    //table = $("all-coins");
    // Table must be defined as table.thead.tr.th where target is th
    table = event.target.parentNode.parentNode.parentNode;
    switching = true;
    dir = "asc";  // Set the sorting direction to ascending:
    
    /* Make a loop that will continue until no switching has been done: */
  	while (switching) {
    	// Start by saying: no switching is done:
    	switching = false;
    	rows = table.tBodies[0].getElementsByTagName("TR");
    	// Loop through all table rows in the TBODY section:
    	for (i = 0; i < (rows.length - 1); i++) {
			shouldSwitch = false;
			
			// Get the two elements you want to compare, one from current row and one from the next:
			x = rows[i].getElementsByTagName("TD")[col];
			y = rows[i + 1].getElementsByTagName("TD")[col];
			
			// Check if the two rows should switch place, based on the direction, asc or desc:
			// I prefer strings to start ASC but numbers DESC
			if (dir == "asc") {
				if(type==0){ if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) { shouldSwitch = true; break; } }
				if(type==1){ if (parseInt(stripCommas(x.innerHTML))   < parseInt(stripCommas(y.innerHTML)))   { shouldSwitch = true; break; } }
				if(type==2){ if (parseFloat(stripCommas(x.innerHTML)) < parseFloat(stripCommas(y.innerHTML))) { shouldSwitch = true; break; } }
				//if(type==3){ if (Date(x.innerHTML) > Date(y.innerHTML)) { shouldSwitch= true; break; } }
			} else if (dir == "desc") {
				if(type==0){ if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) { shouldSwitch = true; break; } }
				if(type==1){ if (parseInt(stripCommas(x.innerHTML))   > parseInt(stripCommas(y.innerHTML)))   { shouldSwitch = true; break; } }
				if(type==2){ if (parseFloat(stripCommas(x.innerHTML)) > parseFloat(stripCommas(y.innerHTML))) { shouldSwitch = true; break; } }
				//if(type==3){ if (Date(x.innerHTML) < Date(y.innerHTML)) { shouldSwitch= true; break; } }
			}
	    }

	    if (shouldSwitch) {
	      	// If a switch has been marked, make the switch and mark that a switch has been done:
	      	rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
	      	switching = true;
	      	// Each time a switch is done, increase this count by 1:
	      	switchcount ++; 
	    } else {
	      	// If no switching has been done AND the direction is "asc", set the direction to "desc" and run the while loop again.
	      	if (switchcount == 0 && dir == "asc") {
	        	dir = "desc";
	        	switching = true;
	      	}
	    }
  	}
}

function addClass(element, className) {
    if(element.classList) {
        element.classList.add(className);
    } else {
        // For IE9
        var classes = element.className.split(" ");
        var index = classes.indexOf(className);
        if (index >= 0) { /* already there */ }
        else {
            classes.push(className);
            element.className = classes.join(" ");
        }
    }
}

function removeClass(element, className) {
    if(element.classList) {
        element.classList.remove(className);
    } else {
        // For IE9
        var classes = element.className.split(" ");
        var index = classes.indexOf(className);
        if (index >= 0) {
            classes.splice(index, 1);
            element.className = classes.join(" ");
        }
    }
}

function toggleClass(element, className) {
    if(element.classList) {
        element.classList.toggle(className);
    } else {
        // For IE9
        var classes = element.className.split(" ");
        var index = classes.indexOf(className);
        
        if (index >= 0) { classes.splice(index, 1); }
        else { classes.push(className); }
        
        element.className = classes.join(" ");
    }
}

function webGet(url, callback, extra) {
    var http = new XMLHttpRequest();
    http.open("GET", url, true);
    http.onreadystatechange = function() { 
        if(http.readyState==4) { 
            try { var json = JSON.parse(http.responseText); } 
            catch(ex) { 
                console.log("JSON ERROR", ex.message); 
                console.log('RESPONSE', http.responseText); 
                json = { error: true, message: ex.message };
            }
            callback(json, extra);
        } 
    };
    http.send();
}


// END