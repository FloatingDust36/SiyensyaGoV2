import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/theme';

export default function CameraScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Camera Screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    text: { color: colors.text, fontFamily: fonts.heading, fontSize: 24 },
});