
import { Text, Image, StyleSheet, ScrollView, View, Button, TouchableOpacity, ImagePropTypes, Touchable, ImageBackground, ScaledSize } from "react-native";
import { Dimensions } from 'react-native';
import AppLoading from 'expo-app-loading';
import {useFonts, PressStart2P_400Regular} from '@expo-google-fonts/press-start-2p'
import React, {useState, useReducer} from 'react';
import ViewContainer from "../components/ViewContainer";
import StyledBackground from "../components/StyledBackground"
import utilities from '../utilities'
import TextBanner from "../components/TextBanner";
import AppConstants from "../AppConstants"
import { FlatList } from "react-native-gesture-handler";
import Banner from "../components/Banner";
// import MusicBox from "../MusicBox"
import StaticMusicBox from "../StaticMusicBox"
import { AntDesign , Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';


const OPACITY_STATE = {
    PLAY: 0.5,
    PAUSE: 1
}

const songOpacityReducer = (state, action) => {
    const copy = Object.entries(state).map(([key, value]) => ({[key]:OPACITY_STATE.PAUSE}));

    copy[action.type] = action.payload  
    return copy;
}


export default class StyledMusicPlayer extends React.Component {

    state = {
        isNexting: false,
        flatListRef: null,
        isPlaying: false,
        playbackInstance: null,
        currentIndex: 0,
        volume: 1.0,
        isBuffering: false,
        opacities: Object.assign({}, ...this.props.playlist.map((x)=>({[x.name]:OPACITY_STATE.PAUSE})))
    };

    constructor(props) {
        super(props);

    }



    onPlayPause_dispatchSideEffects = (isPlaying) => {
        const { opacities } = this.state
        const songName = this.props.playlist[this.state.currentIndex].name;
        const opacityLevel = isPlaying? OPACITY_STATE.PLAY : OPACITY_STATE.PAUSE;
        const newOpacities = songOpacityReducer(opacities, {type: songName, payload: opacityLevel});
        this.state.flatListRef.scrollToIndex({animated: true, index: this.state.currentIndex});
        this.setState({opacities: newOpacities});   
    }

    async loadAudio() {
        const {currentIndex, isPlaying, volume} = this.state
      
        try {
          const playbackInstance = new Audio.Sound()
          const source = {
            uri: this.props.playlist[currentIndex].track.uri
          }
      
          const status = {
            shouldPlay: isPlaying,
            volume
          }
      
          playbackInstance.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate)     
          await playbackInstance.loadAsync(source, status, false)
          this.setState({playbackInstance})

          } catch (e) {
            console.log(e)
          }
    }

    onPlaybackStatusUpdate = status => {
        
        this.setState({
          isBuffering: status.isBuffering
        })

        if (status.didJustFinish) {
            const {currentIndex} = this.state;
            if (currentIndex === this.props.playlist.length - 1) {
                this.handlePlayPause();
                return;
            }
            this.handleNextTrack();
        }
    }

    handleSongButton = async (songName) => {

        const {currentIndex} = this.state;
        if (songName === this.props.playlist[this.state.currentIndex]) {
            await this.handlePlayPause();
        } else if (currentIndex === this.props.playlist.length - 1) {
            songName = this.props.playlist[0].name;
        }
        else {
            var songIndex = this.props.playlist.findIndex((x)=>x.name===songName);
            if (songIndex===-1){
                console.warn("ERROR: SONG NOT FOUND: 103");
            }
            try {
                if(songIndex === -1) {songIndex = 0}
                let { playbackInstance } = this.state
                if (playbackInstance) {
                await playbackInstance.unloadAsync()

                this.setState({
                    currentIndex: songIndex
                })
                this.setState({
                    isPlaying: true
                })
                this.loadAudio()
                }
                this.onPlayPause_dispatchSideEffects(true);
            }
            catch (err) {
                console.error(err);
            }
            
        }
    }

    handlePlayPause = async () => {
        const { isPlaying, playbackInstance } = this.state
        isPlaying ? await playbackInstance.pauseAsync() : await playbackInstance.playAsync()
    
        this.onPlayPause_dispatchSideEffects(!isPlaying);

        this.setState({
          isPlaying: !isPlaying
        })
      }
    
    handlePreviousTrack = async () => {
        let { playbackInstance, currentIndex, isPlaying } = this.state

        if (!isPlaying && currentIndex === 0) {
            await this.handlePlayPause();
        }
        else if (currentIndex === 0) {
            return;
        } else if (playbackInstance) {
          await playbackInstance.unloadAsync()
          currentIndex > 0 ? (currentIndex -= 1) : (currentIndex = 0)
          this.setState({
            currentIndex
          })
          
          this.setState({
                isPlaying: true
            })

          this.loadAudio()
        }
        this.onPlayPause_dispatchSideEffects(true);
      }
    

    handleNextTrack = async () => {
        
        let { playbackInstance, currentIndex, isPlaying} = this.state

        if (this.state.isNexting) {
            return;
        }
        else if (!isPlaying && currentIndex === 0) {
            await this.handlePlayPause();
        }
        else if (playbackInstance) {
            this.state.isNexting = true;
          await playbackInstance.unloadAsync()
          currentIndex < this.props.playlist.length - 1 ? (currentIndex += 1) : (currentIndex = 0)
          this.setState({
            currentIndex
          })

          this.setState({
                isPlaying: true
            })

          this.loadAudio()
        }
        this.onPlayPause_dispatchSideEffects(true);
        this.state.isNexting = false;
    }

    async componentDidMount() {

        // this._unsubscribe = this.props.navigation.addListener('focus', () => {this.state.playbackInstance.unloadAsync(); console.log("a")});
        // const initialOpacityState = this.props.playlist.map((element) => {
        //     var dict = {}; dict[element.name] = OPACITY_STATE.PAUSE; return dict
        // });

        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
                playsInSilentModeIOS: true,
                interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
                shouldDuckAndroid: true,
                staysActiveInBackground: false,
                playThroughEarpieceAndroid: true
            });
            this.loadAudio();
        } catch (err) {
            console.log(err);
        }

    }

    async componentWillUnmount() {
        this.state.playbackInstance.unloadAsync();
    }



    render() {
        return (
            <ViewContainer color='clear' height='54.5454545%' width='50%' top='.6%' nudge>
                <ViewContainer height='20%' width='50%'>
                        <TextBanner 
                            noBottom 
                            height='100%' 
                            width='100%' 
                            borderWidth={this.props.bannerBorderWidth}
                            fontSize={this.props.subtitleFontSize}
                            lineHeight={this.props.subtitleLineHeight}
                        >{this.props.themeName}</TextBanner>
                    </ViewContainer>
                <Banner 
                        height='65%' 
                        width='100%'
                        borderWidth={this.props.bannerBorderWidth}
                        corners
                        // noBackground
                    >
                        <FlatList
                            ref={(ref) => {this.state.flatListRef = ref}}
                            vertical
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            keyExtractor={(track) => track.name}
                            data={this.props.playlist}
                            renderItem={({item}) => {
                                return (
                                    <Banner 
                                        height='100%' 
                                        width='100%' 
                                        corners
                                        noBorder
                                        noBackground>
                                            
                                    <TouchableOpacity 
                                        onPress={() => {
                                            this.handleSongButton(item.name)}}>
                                        <View style={{opacity: this.state.opacities[item.name]}}>
                                            <ScrollView  
                                                style={{flexDirection: 'row'}}
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                nestedScrollEnabled 
                                                contentContainerStyle={{backgroundColor: 'clear'}}
                                                
                                                
                                            >   
                                                <View><Text style={this.props.fontStyle(this.props.subtitleFontSize, this.props.subtitleLineHeight, 'flex-start', this.props.subtitleFontSize/2, "Tinos_400Regular").style}
                                                >{item.name} / {item.artist}</Text></View>
                                               
                                            </ScrollView>
                                            <ScrollView>
                                                <View><Text style={this.props.fontStyle(this.props.titleFontSize, this.props.titleLineHeight, 'center', 0, "PressStart2P_400Regular").style}
                                                >--------------</Text></View>                                            
                                            </ScrollView>
                                            
                                        </View>
                                    </TouchableOpacity></Banner>
                                )
                            }}
                        >
                            
                        </FlatList>
                    </Banner >
                    <ViewContainer color='clear' height='15%' width='100%'>
                        <TextBanner 
                            noTop
                            height='100%'
                            width='100%'
                            borderWidth={this.props.bannerBorderWidth}
                            fontSize={this.props.subtitleFontSize}
                            lineHeight={this.props.subtitleLineHeight}
                        >

                            <TouchableOpacity
                                onPress={this.handlePreviousTrack}
                            >
                                <Ionicons  
                                    name="play-skip-back-circle"
                                    size={this.props.titleFontSize} 
                                    color="white"
                                    >
                                </Ionicons>
                            </TouchableOpacity>

                            <Text> </Text>

                            <TouchableOpacity
                                onPress={this.handlePlayPause}
                            >
                                {this.state.isPlaying ? (
                                    <AntDesign name='pausecircle' size={this.props.titleFontSize} color="white" />
                                    ) : (
                                    <AntDesign name='play' size={this.props.titleFontSize} color="white" />
                                )}
                            </TouchableOpacity>

                            <Text> </Text>

                            <TouchableOpacity
                                onPress={this.handleNextTrack}
                            >
                                <Ionicons  
                                    name="play-skip-forward-circle"
                                    size={this.props.titleFontSize} 
                                    color="white"
                                    >
                                </Ionicons>
                            </TouchableOpacity>
                        </TextBanner>
                    </ViewContainer>
            </ViewContainer>
        )
    }
}