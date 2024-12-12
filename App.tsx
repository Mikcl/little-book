import React, { useReducer, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

interface Virtue {
  name: string;
  emoji: string;
  description: string;
}

const virtuesDict: Record<string, Virtue> = {
  'Temperance': { name: 'Temperance', emoji: '🧘‍♂️', description: 'Eat not to dullness; drink not to elevation.' },
  'Silence': { name: 'Silence', emoji: '🕊️', description: 'Speak only when it benefits others or yourself. Avoid trifling conversation.' },
  'Order': { name: 'Order', emoji: '🗂️', description: 'Let all things have their place; let each part of your business have its time.' },
  'Resolution': { name: 'Resolution', emoji: '💪', description: 'Resolve to perform what you ought; perform without fail what you resolve.' },
  'Frugality': { name: 'Frugality', emoji: '🌱', description: 'Make no expense but to do good to others or yourself; waste nothing.' },
  'Industry': { name: 'Industry', emoji: '🛠️', description: 'Always be engaged in something useful; avoid idleness.' },
  'Sincerity': { name: 'Sincerity', emoji: '🤝', description: 'Use no hurtful deceit; think innocently and justly, and speak accordingly.' },
  'Justice': { name: 'Justice', emoji: '⚖️', description: 'Wrong none by doing injuries or omitting benefits that are your duty.' },
  'Moderation': { name: 'Moderation', emoji: '🛑', description: 'Avoid extremes; forbear resenting injuries as much as you think they deserve.' },
  'Cleanliness': { name: 'Cleanliness', emoji: '✨', description: 'Keep your body, clothes, and habitation clean.' },
  'Tranquility': { name: 'Tranquility', emoji: '🌳', description: 'Be not disturbed at trifles, or at accidents common or unavoidable.' },
  // This is actually 'Chastity' but reworded to purity to avoid sexual connotations.
  'Purity': { name: 'Purity', emoji: '❤️', description: 'Use actions thoughtfully, aligning them with their purpose; never to dullness, weakness, or the injury of your own or another’s peace or reputation.' },
  // Taken Eliezer Yudkowsky description as "Imitate Jesus and Socrates" people may not know.
  'Humility': { name: 'Humility', emoji: '😊', description: 'Take specific actions in anticipation of your own errors' },
};

const virtues = Object.keys(virtuesDict);

// FIXME: remove globalDay referencing, only for developer mode.
// var globalDay = new Date();

const today = (): string => {
  const now = new Date();
  // const now = globalDay;
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};


const fromTimestamp = (yyyymmdd: string): Date => {
  const yyyymmddString = yyyymmdd;
  const yearFromStr = parseInt(yyyymmddString.substring(0, 4), 10);
  const monthFromStr = parseInt(yyyymmddString.substring(4, 6), 10) - 1;
  const dayFromStr = parseInt(yyyymmddString.substring(6, 8), 10);
  return new Date(yearFromStr, monthFromStr, dayFromStr);
};

function weeksBetween(date1: Date, date2: Date): number {
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const diffInMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffInMs / msInWeek);
}

function getWeekNumber(d: Date): number {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  // Handle years with 53 weeks with a duplicate?
  return Math.min(weekNo - 1, 51);
}

const sundaysGone = (date: Date): number => {
  const year = date.getUTCFullYear();

  // Get the day of the week for January 1st of the year
  const jan1Day = new Date(Date.UTC(year, 0, 1)).getUTCDay();

  // Calculate the total number of days passed in the year so far
  const dayOfYear = Math.floor((date.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Adjust jan1Day to treat Sunday as the start of the week
  const offset = (7 - jan1Day) % 7; // Days until the first Sunday

  // Calculate the number of Sundays
  const sundaysPassed = Math.floor((dayOfYear - offset + 6) / 7);

  return sundaysPassed;
};

function dayIndex(yyyymmdd: string) {
  const date = fromTimestamp(yyyymmdd);
  const day = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  return (day + 6) % 7;
  // return (day === 0 ? 6 : day - 1); // Map Sunday to 6, Monday to 0, etc.
}

interface Entry {
  date: string;
  isSuccess: boolean;
}


const entriesByDate = (entries: Entry[]): Record<string, Entry> => {
  return entries.reduce((acc, entry) => {
    acc[entry.date] = entry;
    return acc;
  }, {} as Record<string, Entry>);
};

const scoring = (entries: Entry[]): number => {
  const uniqueEntries = entriesByDate(entries);

  const filteredEntries = Object.values(uniqueEntries);

  return filteredEntries
    .reduce((score, entry) => score + (entry.isSuccess ? 1 : 0), 0);
};

const failures = (entries: Entry[]): number => {
  const uniqueEntries = entriesByDate(entries);

  const filteredEntries = Object.values(uniqueEntries);

  return filteredEntries
    .reduce((score, entry) => score + (entry.isSuccess ? 0 : 1), 0);
};


const currentStreak = (entries: Entry[]): number => {
  const uniqueEntries = entriesByDate(entries);

  // sort descending by date
  const filteredEntries = Object.values(uniqueEntries).sort(
    (a, b) => parseInt(b.date, 10) - parseInt(a.date, 10)
  );

  let streak = 0;
  let prevDate: Date | null = null;

  for (const entry of filteredEntries) {
    const entryDate = fromTimestamp(entry.date);

    // weird offset to account for strange time differences, it is still "not more than a day"
    if (prevDate && (prevDate.getTime() - entryDate.getTime()) > (24 + 5) * 60 * 60 * 1000) {
      break; // not consecutive
    }
    prevDate = entryDate;
    streak++;
  }

  return streak;
};


interface UserState {
  entries: Entry[]
}

const getVirtue = (yyyymmdd: string): string => {
  return virtues[getWeekNumber(fromTimestamp(yyyymmdd)) % virtues.length];
};

const todaysVirtue = (): string => {
  return getVirtue(today());
};

const initialState: UserState = {
  entries: [],
};

function reducer(state: UserState, action: {type: string, payload?: UserState}): UserState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'PASS':
      const passedEntries = state.entries.filter((entry) => entry.date !== today());
      passedEntries.push({date: today(), isSuccess: true});
      // globalDay.setDate(globalDay.getDate() + 1);
      return { ...state, entries: passedEntries  };
    case 'FAIL':
      const failedEntries = state.entries.filter((entry) => entry.date !== today());
      failedEntries.push({date: today(), isSuccess: false});
      // globalDay.setDate(globalDay.getDate() + 1);
      return { ...state, entries: failedEntries };
    default:
      return state;
  }
}


export const unsqueeze = (entries: Entry[]): Entry[][] => {
  return entries.reduce((weekly: Entry[][], entry) => {

    const previousWeek = weekly.length ? weekly[weekly.length - 1] : [];

    const previousEntry: Entry | null = previousWeek.length ? previousWeek[previousWeek.length - 1] : null;

    const entryDate = fromTimestamp(entry.date);
    const entryIndex = dayIndex(entry.date);

    if (previousEntry === null) {
      weekly.push([entry]);
      return weekly;
    }

    const previousDate = fromTimestamp(previousEntry.date);
    const previousIndex = dayIndex(previousEntry.date);
    const weeks = weeksBetween(previousDate, entryDate);

    const higherIndex = entryIndex > previousIndex;
    const isSameWeek = weeks === 0 && higherIndex;

    if (isSameWeek) {
      previousWeek.push(entry);
      return weekly;
    }

    for (let i = 0; i < weeks; i++) {
      if (i === weeks - 1 && !higherIndex) {
        continue;
      }
      weekly.push([]);
    }
    weekly.push([entry]);
    return weekly;
  },[]);
};

interface RowProps {
  virtue: string;
  entries: Entry[];
  note: string
}

const entriesToRow = (entries: Entry[]): string[] => {
  return entries.reduce((result, entry: Entry, i: number) => {
    // pad days of the week where there was no entry
    const previousEntry = i !== 0 ? entries[i - 1] : null;

    const blankDays = previousEntry === null ? dayIndex(entry.date) : dayIndex(entry.date) - dayIndex(previousEntry.date) - 1;

    for (let j = 0; j < blankDays; j++) {
      result.push('⬜');
    }
    result.push(entry.isSuccess ? '🌸' : '🔴');
    return result;

  }, [] as string[]);

};

function Row({ virtue, entries, note }: RowProps): React.JSX.Element {
  const rowIcons = entriesToRow(entries);

  return (
    <View>
      <Text style={styles.history}>{virtue}: {rowIcons.join(' ')}{note !== '' && rowIcons.length === 7 ? '  ' + note : ''}</Text>
    </View>
  );

}

const InfoIcon = (): React.JSX.Element => {
  const sentence = 'Benjamin Franklin did not attempt to work on all the virtues simultaneously but instead focused on one virtue per week';

  const experience = 'noting in his autobiography that, although he never achieved perfection in these virtues, the attempt itself was highly beneficial to his success and happiness.';

  const descriptions = Object.values(virtuesDict).map((v) => `${v.emoji} ${v.name}: ${v.description}`);

  const lastWords = '"I hope, therefore, that some of my descendants may follow the example and reap the benefit"';

  const messages = [
    sentence,
    experience,
    lastWords,
    '----------',
    'each day you can pass/fail the virtue, each monday the next virtue begins!',
    '----------',
    descriptions.join('\n\n'),
  ];

  const handlePress = () => {
    Alert.alert(
      'guide',
      messages.join('\n\n'),
      [{ text: 'got it!' }]
    );
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={styles.infoText}>ℹ️</Text>
    </TouchableOpacity>
  );
};


interface HistoricalProps {
  entries: Entry[];
}

function Historical({ entries }: HistoricalProps): React.JSX.Element {
  const weeks: Entry[][] = unsqueeze(entries);
  // the most recent entry is not necessarily from this week.
  const latestEntryWeekDate = weeks.length ? weeks[weeks.length - 1][0].date : today();
  const relDate = fromTimestamp(latestEntryWeekDate);
  const lastYear = relDate.getFullYear();
  const lastWoy = sundaysGone(relDate);
  const weeksGone = (lastYear * 52) + lastWoy;
  const latestVirtue = getVirtue(latestEntryWeekDate);
  const latestVirtueIndex = virtues.indexOf(latestVirtue);

  const weeksReversed = [...weeks].reverse();

  return (
    <View>
      {weeksReversed.map(
        (week, i) => {
          let virtueIndex = (latestVirtueIndex - i) % virtues.length;
          if (virtueIndex < 0) {
            virtueIndex = virtues.length + virtueIndex;
          }

          const weekIndex = weeksGone - i;
          const woy = weekIndex % 52;
          const year = Math.floor(weekIndex / 52);
          const quarter = woy < 13 ? 1 : woy < 26 ? 2 : woy < 39 ? 3 : 4;

          return (
            <View key={i}>
              <Row
                virtue={virtuesDict[virtues[virtueIndex]].emoji}
                entries={week}
                note={
                  virtueIndex === 0 ? `${year} Q${quarter}` : ''
                }
              />
              {/* eslint-disable-next-line react-native/no-inline-styles */}
              {virtueIndex === 0 && <View style={{marginVertical: 5}} />}
            </View>
          );
        }
        )
      }
    </View>
  );
}

function Daily(): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loadState = async () => {
      try {
        const entriesString = await AsyncStorage.getItem('ENTRIES');
        const entries = entriesString != null ? JSON.parse(entriesString) as Entry[] : [];

        dispatch({
          type: 'LOAD_STATE',
          payload: {
            entries: [],
          },
        });
      } catch (error) {
        console.error('Failed to load state:', error);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    const saveState = async () => {
      try {
        const uniqueEntries = Object.values(entriesByDate(state.entries));
        await AsyncStorage.setItem('ENTRIES', JSON.stringify(uniqueEntries));
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    };
    saveState();
  }, [state.entries]);

  const handlePass = () => {
    dispatch({ type: 'PASS' });
  };

  const handleFail = () => {
    dispatch({ type: 'FAIL' });
  };

  const virtueDetails = virtuesDict[todaysVirtue()];

  const todaysResponse = state.entries.length && state.entries[state.entries.length - 1].date === today() ? state.entries[state.entries.length - 1] : null;

  return (
    <View style={styles.dailyContainer}>
      <View style={styles.topSection}>
        <Text style={styles.leftScore}>🔥 {currentStreak(state.entries)} 🌸 {scoring(state.entries)} 🔴 {failures(state.entries)}</Text>
        <View>
          <InfoIcon />
        </View>
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.virtue}>{virtueDetails.name}</Text>
        <Text style={styles.details}>{virtueDetails.description}</Text>
        <Text style={styles.virtue}>
          {virtueDetails.emoji}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleFail}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ fontWeight: todaysResponse && todaysResponse.isSuccess === false ? 'bold' : 'normal', fontSize: 19 }}>🔴 Fail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePass}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ fontWeight: todaysResponse && todaysResponse.isSuccess ? 'bold' : 'normal', fontSize: 20 }}>Pass 🌸</Text>
        </TouchableOpacity>
      </View>

      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <View style={{marginTop: '20%'}}>
        <Historical entries={state.entries}/>
      </View>
    </View>
  );

}


function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
            <Daily />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  history: {
    fontSize: 20,
    marginBottom: 2,
    textAlign: 'left',
  },
  virtue: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dailyContainer: {
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    padding: 20,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '20%',
  },
  leftScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4500', // Fire color
  },
  rightHelp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000', // Black for scores
  },
  middleSection: {
    justifyContent: 'center', // Center virtue details
    alignItems: 'center',
    textAlign: 'center',
    minHeight: 60,
  },
  details: {
    fontSize: 16,
    color: '#555', // Grey for description
    textAlign: 'center',
    minHeight: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Evenly space the buttons
    marginVertical: 20,
  },
  infoButton: {
    fontSize: 18,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default App;
