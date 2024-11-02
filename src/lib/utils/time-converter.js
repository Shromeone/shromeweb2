export function timeToChinese(time = 0) {
    const mins = Math.floor(time/60);
    const secs = time % 60;
    let final = '';
    if (mins > 0) {
        final += `${mins}分鐘`;
    }

    if (secs > 0) {
        final += `${secs}秒`;
    }

    return final;
}