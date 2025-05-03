import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as Speech from 'expo-speech';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';



const db = SQLite.openDatabase('visitor.db');

export default function App() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseBlock, setHouseBlock] = useState('A');
  const [houseNumber, setHouseNumber] = useState('');
  const [purpose, setPurpose] = useState('guest');
  const [vehicleType, setVehicleType] = useState('Two Wheeler');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [entryNumber, setEntryNumber] = useState(1);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permissions are required to use this feature.');
      }
    })();

    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS visitors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, house TEXT, purpose TEXT, vehicle TEXT, photo TEXT, entry_time TEXT);'
      );
    });
  }, []);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
    });
    if (!result.cancelled) {
      setPhotoUri(result.uri);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setHouseBlock('A');
    setHouseNumber('');
    setPurpose('guest');
    setVehicleType('Two Wheeler');
    setVehicleNumber('');
    setPhotoUri(null);
  };

  const handleSubmit = () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    const fullPhone = `+91${phone}`;
    const currentTime = new Date().toLocaleString();
    const house = `${houseBlock}-${houseNumber}`;
    const vehicle = `${vehicleType} - ${vehicleNumber}`;

    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO visitors (name, phone, house, purpose, vehicle, photo, entry_time) values (?, ?, ?, ?, ?, ?, ?);',
        [name, fullPhone, house, purpose, vehicle, photoUri || '', currentTime],
        (_, result) => {
          Alert.alert('Visitor Registered', `Entry #${entryNumber} saved successfully.`);
          setEntryNumber(prev => prev + 1);
          resetForm();
          storeVisitorLocally({ name, phone: fullPhone, house, purpose, vehicle, photoUri, entry_time: currentTime });
        },
        (_, error) => {
          console.error('DB Error:', error);
          return false;
        }
      );
    });
  };

  const storeVisitorLocally = async (visitorData) => {
    try {
      const data = await AsyncStorage.getItem('visitors');
      const visitors = data ? JSON.parse(data) : [];
      visitors.push(visitorData);
      await AsyncStorage.setItem('visitors', JSON.stringify(visitors));
    } catch (error) {
      console.error('Error storing visitor locally', error);
    }
  };

  const exportToCSV = async () => {
    try {
      const data = await AsyncStorage.getItem('visitors');
      const visitors = data ? JSON.parse(data) : [];

      if (visitors.length === 0) {
        Alert.alert('No data', 'There are no visitor entries to export.');
        return;
      }

      const csvHeader = 'Entry Number,Name,Phone,House,Purpose,Vehicle,Entry Time\n';
      const csvRows = visitors.map((v, index) =>
        `${index + 1},"${v.name}","${v.phone}","${v.house}","${v.purpose}","${v.vehicle}","${v.entry_time}"`
      );

      const csvString = csvHeader + csvRows.join('\n');
      const fileUri = FileSystem.documentDirectory + 'visitor_entries.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available on this device');
      }

    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  const handleVoiceInput = (fieldSetter) => {
    Speech.speak('Please say the text after the beep.', {
      onDone: () => {
        const simulatedInput = 'Simulated Voice Input';
        fieldSetter(simulatedInput);
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Visitor Registration</Text>

      <Text>Name:</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter name"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <Button title="🎤 Voice Input" onPress={() => handleVoiceInput(setName)} />

      <Text>Phone (+91):</Text>
      <TextInput
        value={phone}
        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="numeric"
        placeholder="10-digit number"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Text>House Block:</Text>
      <Picker selectedValue={houseBlock} onValueChange={setHouseBlock}>
        <Picker.Item label="A" value="A" />
        <Picker.Item label="B" value="B" />
        <Picker.Item label="C" value="C" />
      </Picker>

      <Text>House Number:</Text>
      <TextInput
        value={houseNumber}
        onChangeText={setHouseNumber}
        placeholder="Enter house number"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Text>Purpose of Visit:</Text>
      <Picker selectedValue={purpose} onValueChange={setPurpose}>
        <Picker.Item label="Guest" value="guest" />
        <Picker.Item label="Repairman" value="repairman" />
        <Picker.Item label="Deliveryman" value="deliveryman" />
        <Picker.Item label="Other" value="other" />
      </Picker>
      <Button title="🎤 Voice Input" onPress={() => handleVoiceInput(setPurpose)} />

      <Text>Vehicle Type:</Text>
      <Picker selectedValue={vehicleType} onValueChange={setVehicleType}>
        <Picker.Item label="Two Wheeler" value="Two Wheeler" />
        <Picker.Item label="Four Wheeler" value="Four Wheeler" />
        <Picker.Item label="Cycle" value="Cycle" />
        <Picker.Item label="Auto Rickshaw" value="Auto Rickshaw" />
      </Picker>

      <Text>Vehicle Number:</Text>
      <TextInput
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
        placeholder="Enter vehicle number"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Button title="Take Photo" onPress={takePhoto} />
      {photoUri && <Image source={{ uri: photoUri }} style={{ width: 200, height: 200, marginVertical: 10 }} />}

      <Button title="Submit" onPress={handleSubmit} color="green" />

      <Button title="Export to Excel (.csv)" onPress={exportToCSV} color="blue" />
    </ScrollView>
  );
}
