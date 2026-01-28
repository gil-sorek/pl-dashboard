async function checkLiveEvent() {
    try {
        const response = await fetch('https://fantasy.premierleague.com/api/event/1/live/');
        const liveData = await response.json();

        // liveData.elements is an array of objects with id and stats
        const firstElement = liveData.elements[0];

        if (firstElement) {
            console.log("Live Element Stats:", JSON.stringify(firstElement.stats, null, 2));
        } else {
            console.log("No elements found in live data");
        }

    } catch (e) {
        console.error(e);
    }
}

checkLiveEvent();
