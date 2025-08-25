function test(no) {
    for (let i = 0; i < no; i++) {
        let r = '';
        // for (let k = 0; k < no - i - 1; k++) {
        //     r += ' ';
        // }
        for (let j = 0; j < no; j++) {
            if (i == j || i + j == no - 1) {
                r += 'i';
            } else r += ' ';
        }
        console.log(r);
    }
}
test(15);
