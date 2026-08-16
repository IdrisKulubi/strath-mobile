import assert from 'node:assert/strict';
import test from 'node:test';

import {
    calculateProfileCompletion,
    getProfileCompletionTasks,
} from './profile-completion.ts';

test('prioritizes the missing guided profile sections', () => {
    const tasks = getProfileCompletionTasks({
        firstName: 'Idris',
        lastName: 'Kulubi',
        yearOfStudy: 3,
    });

    assert.deepEqual(
        tasks.slice(0, 3).map((task) => task.id),
        ['education', 'dating', 'personality'],
    );
});

test('removes sections once their required details are present', () => {
    const tasks = getProfileCompletionTasks({
        university: 'Strathmore University',
        course: 'Computer Science',
        lookingFor: 'serious',
        interestedIn: ['women'],
        communicationStyle: 'direct',
        personalityType: 'ambivert',
        loveLanguage: 'quality_time',
        qualities: ['kind'],
        sleepingHabits: 'early_bird',
        drinkingPreference: 'no',
        workoutFrequency: 'often',
        socialMediaUsage: 'sometimes',
        height: '180 cm',
        education: 'bachelors',
        smoking: 'no',
        politics: 'moderate',
        religion: 'christian',
        instagram: 'idris',
    });

    assert.deepEqual(tasks, []);
});

test('keeps completion within the zero to one hundred range', () => {
    assert.equal(calculateProfileCompletion(null), 0);
    assert.ok(calculateProfileCompletion({ firstName: 'Idris', lastName: 'Kulubi' }) > 0);
    assert.ok(calculateProfileCompletion({ instagram: 'idris', spotify: 'idris' }) <= 100);
});
