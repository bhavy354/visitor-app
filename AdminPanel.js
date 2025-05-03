import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, Alert, Picker, TextInput, Modal, Image } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

const db = SQLite.openDatabase('visitor.db');

const AdminPanel = () => {
  const [visitors, setVisitors] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [filterByPurpose, setFilterByPurpose] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null); // State to hold selected visitor for details modal
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility state

  useEffect(() => {
    const fetchVisitors = () => {
      let query = 'SELECT * FROM visitors';
      const params = [];

      if (filterByPurpose) {
        query += ' WHERE purpose = ?';
        params.push(filterByPurpose);
      }

      if (searchText) {
        query += filterByPurpose ? ' AND name LIKE ?' : ' WHERE name LIKE ?';
        params.push(`%${searchText}%`);
      }

      query += ` ORDER BY ${sortBy}`;

      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, { rows }) => {
            setVisitors(rows._array);
          },
          (_, error) => {
            console.error('Error fetching visitors:', error);
            return false;
          }
        );
      });
    };

    fetchVisitors();
  }, [sortBy, filterByPurpose, searchText]);

  const handleCheckOut = (id) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM visitors WHERE id = ?;',
        [id],
        () => {
          Alert.alert('Visitor Checked Out', 'The visitor has been successfully checked out.');
          fetchVisitors();
        },
        (_, error) => {
          console.error('Error checking out visitor:', error);
          return false;
        }
      );
    });
  };

  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor); // Set selected visitor for modal
    setIsModalVisible(true); // Show the modal
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(visitors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitors');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    
    const fileUri = FileSystem.documentDirectory + 'visitor_data.xlsx';
    FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 })
      .then(() => {
        Sharing.shareAsync(fileUri); 
      })
      .catch(error => {
        console.error('Error exporting Excel:', error);
      });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Admin Panel</Text>

      {/* Search */}
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search by Name"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      
      {/* Filter by Purpose */}
      <Text>Filter by Purpose:</Text>
      <Picker selectedValue={filterByPurpose} onValueChange={setFilterByPurpose}>
        <Picker.Item label="All" value="" />
        <Picker.Item label="Guest" value="guest" />
        <Picker.Item label="Repairman" value="repairman" />
        <Picker.Item label="Deliveryman" value="deliveryman" />
        <Picker.Item label="Other" value="other" />
      </Picker>

      {/* Sort By */}
      <Text>Sort By:</Text>
      <Picker selectedValue={sortBy} onValueChange={setSortBy}>
        <Picker.Item label="Name" value="name" />
        <Picker.Item label="Purpose" value="purpose" />
        <Picker.Item label="Entry Time" value="entry_time" />
      </Picker>

      {visitors.length > 0 ? (
        visitors.map((visitor) => (
          <View key={visitor.id} style={{ marginBottom: 15, padding: 10, borderWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>Name: {visitor.name}</Text>
            <Text>Phone: {visitor.phone}</Text>
            <Text>House: {visitor.house}</Text>
            <Text>Purpose: {visitor.purpose}</Text>
            <Text>Vehicle: {visitor.vehicle}</Text>
            <Text>Entry Time: {visitor.entry_time}</Text>
            
            <Button
              title="View Details"
              onPress={() => handleViewDetails(visitor)}
              color="blue"
            />
            <Button
              title="Check-out"
              onPress={() => handleCheckOut(visitor.id)}
              color="red"
            />
          </View>
        ))
      ) : (
        <Text>No visitors found</Text>
      )}

      <Button title="Export to Excel" onPress={exportToExcel} color="green" />

      {/* Modal for viewing visitor details */}
      {selectedVisitor && (
        <Modal
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
          animationType="slide"
          transparent={true}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Visitor Details</Text>
              <Text>Name: {selectedVisitor.name}</Text>
              <Text>Phone: {selectedVisitor.phone}</Text>
              <Text>House: {selectedVisitor.house}</Text>
              <Text>Purpose: {selectedVisitor.purpose}</Text>
              <Text>Vehicle: {selectedVisitor.vehicle}</Text>
              <Text>Entry Time: {selectedVisitor.entry_time}</Text>
              {selectedVisitor.photo ? (
                <Image source={{ uri: selectedVisitor.photo }} style={{ width: 200, height: 200, marginVertical: 10 }} />
              ) : null}
              <Button title="Close" onPress={() => setIsModalVisible(false)} />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default AdminPanel;
