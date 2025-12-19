(function defineLevelVideoMap() {
    if (typeof window === 'undefined') {
        return;
    }
    if (window.LEVEL_VIDEO_MAP && typeof window.LEVEL_VIDEO_MAP === 'object') {
        return;
    }
    window.LEVEL_VIDEO_MAP = {
        1: 'video 1.mp4',
        2: 'video 2.mp4',
        3: 'video 3.mp4',
        4: 'video 4.mp4',
        5: 'video 5.mp4',
        6: 'video 6.mp4',
        7: 'video 7.mp4'
    };
})();
