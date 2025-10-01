import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/theme';

export default function MuseumScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Museum Screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    text: { color: colors.text, fontFamily: fonts.heading, fontSize: 24 },
});