'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Repeat, 
  RepeatOne, 
  Shuffle, 
  Maximize2, 
  Minimize2, 
  Settings, 
  Brain, 
  Zap, 
  Target, 
  Award, 
  Crown, 
  Sparkles, 
  Globe, 
  Languages, 
  Tv, 
  Monitor, 
  Smartphone, 
  Headphones, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryCharging, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  HelpCircle, 
  RefreshCw, 
  Power, 
  PowerOff, 
  LogOut, 
  LogIn, 
  Home, 
  Search, 
  Filter, 
  Grid, 
  List, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Bell, 
  BellOff, 
  Flag, 
  FlagOff, 
  Trash2, 
  Edit2, 
  Save, 
  Copy, 
  Move, 
  Link, 
  Unlink, 
  Plus, 
  Minus, 
  Divide, 
  Percent, 
  Hash, 
  AtSign, 
  Slash, 
  Backslash, 
  Pipe, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUpRight, 
  ArrowUpLeft, 
  ArrowDownRight, 
  ArrowDownLeft, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Move as MoveIcon, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Crop, 
  Scissors, 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Indent, 
  Outdent, 
  ListOrdered, 
  ListUnordered, 
  Quote, 
  Code, 
  Image, 
  File, 
  Folder, 
  FolderOpen, 
  Archive, 
  Package, 
  Box, 
  PackageOpen, 
  Truck, 
  Send, 
  Paperclip, 
  PaperclipOff, 
  Link2, 
  Link2Off, 
  Unlink2, 
  Eye, 
  EyeOff, 
  Scan, 
  ScanLine, 
  ScanFace, 
  ScanLine as ScanLineIcon, 
  ScanFace as ScanFaceIcon, 
  Fingerprint, 
  FingerprintOff, 
  KeyRound, 
  KeyRoundOff, 
  LockRound, 
  LockRoundOff, 
  UnlockRound, 
  UnlockRoundOff, 
  ShieldCheck, 
  ShieldCheckOff, 
  ShieldX, 
  ShieldXOff, 
  ShieldAlert, 
  ShieldAlertOff, 
  ShieldQuestion, 
  ShieldQuestionOff, 
  UserRound, 
  UserRoundOff, 
  UserRoundCheck, 
  UserRoundCheckOff, 
  UserRoundX, 
  UserRoundXOff, 
  UserRoundPlus, 
  UserRoundPlusOff, 
  UserRoundMinus, 
  UserRoundMinusOff, 
  UserRoundDivide, 
  UserRoundDivideOff, 
  UserRoundPercent, 
  UserRoundPercentOff, 
  UserRoundHash, 
  UserRoundHashOff, 
  UserRoundAtSign, 
  UserRoundAtSignOff, 
  UserRoundSlash, 
  UserRoundSlashOff, 
  UserRoundBackslash, 
  UserRoundBackslashOff, 
  UserRoundPipe, 
  UserRoundPipeOff, 
  UserRoundArrowUp, 
  UserRoundArrowUpOff, 
  UserRoundArrowDown, 
  UserRoundArrowDownOff, 
  UserRoundArrowLeft, 
  UserRoundArrowLeftOff, 
  UserRoundArrowRight, 
  UserRoundArrowRightOff, 
  UserRoundArrowUpRight, 
  UserRoundArrowUpRightOff, 
  UserRoundArrowUpLeft, 
  UserRoundArrowUpLeftOff, 
  UserRoundArrowDownRight, 
  UserRoundArrowDownRightOff, 
  UserRoundArrowDownLeft, 
  UserRoundArrowDownLeftOff, 
  UserRoundChevronUp, 
  UserRoundChevronUpOff, 
  UserRoundChevronLeft, 
  UserRoundChevronLeftOff, 
  UserRoundChevronRight, 
  UserRoundChevronRightOff, 
  UserRoundMove, 
  UserRoundMoveOff, 
  UserRoundRotateCw, 
  UserRoundRotateCwOff, 
  UserRoundRotateCcw, 
  UserRoundRotateCcwOff, 
  UserRoundFlipHorizontal, 
  UserRoundFlipHorizontalOff, 
  UserRoundFlipVertical, 
  UserRoundFlipVerticalOff, 
  UserRoundCrop, 
  UserRoundCropOff, 
  UserRoundScissors, 
  UserRoundScissorsOff, 
  UserRoundType, 
  UserRoundTypeOff, 
  UserRoundBold, 
  UserRoundBoldOff, 
  UserRoundItalic, 
  UserRoundItalicOff, 
  UserRoundUnderline, 
  UserRoundUnderlineOff, 
  UserRoundStrikethrough, 
  UserRoundStrikethroughOff, 
  UserRoundAlignLeft, 
  UserRoundAlignLeftOff, 
  UserRoundAlignCenter, 
  UserRoundAlignCenterOff, 
  UserRoundAlignRight, 
  UserRoundAlignRightOff, 
  UserRoundAlignJustify, 
  UserRoundAlignJustifyOff, 
  UserRoundIndent, 
  UserRoundIndentOff, 
  UserRoundOutdent, 
  UserRoundOutdentOff, 
  UserRoundListOrdered, 
  UserRoundListOrderedOff, 
  UserRoundListUnordered, 
  UserRoundListUnorderedOff, 
  UserRoundQuote, 
  UserRoundQuoteOff, 
  UserRoundCode, 
  UserRoundCodeOff, 
  UserRoundImage, 
  UserRoundImageOff, 
  UserRoundFile, 
  UserRoundFileOff, 
  UserRoundFolder, 
  UserRoundFolderOff, 
  UserRoundFolderOpen, 
  UserRoundFolderOpenOff, 
  UserRoundArchive, 
  UserRoundArchiveOff, 
  UserRoundPackage, 
  UserRoundPackageOff, 
  UserRoundBox, 
  UserRoundBoxOff, 
  UserRoundPackageOpen, 
  UserRoundPackageOpenOff, 
  UserRoundTruck, 
  UserRoundTruckOff, 
  UserRoundSend, 
  UserRoundSendOff, 
  UserRoundPaperclip, 
  UserRoundPaperclipOff, 
  UserRoundLink2, 
  UserRoundLink2Off, 
  UserRoundUnlink2, 
  UserRoundUnlink2Off, 
  UserRoundEye2, 
  UserRoundEye2Off, 
  UserRoundScan, 
  UserRoundScanOff, 
  UserRoundScanLine, 
  UserRoundScanLineOff, 
  UserRoundScanFace, 
  UserRoundScanFaceOff, 
  UserRoundFingerprint, 
  UserRoundFingerprintOff, 
  UserRoundKeyRound, 
  UserRoundKeyRoundOff, 
  UserRoundLockRound, 
  UserRoundLockRoundOff, 
  UserRoundUnlockRound, 
  UserRoundUnlockRoundOff, 
  UserRoundShieldCheck, 
  UserRoundShieldCheckOff, 
  UserRoundShieldX, 
  UserRoundShieldXOff, 
  UserRoundShieldAlert, 
  UserRoundShieldAlertOff, 
  UserRoundShieldQuestion, 
  UserRoundShieldQuestionOff, 
  UserRoundUserRound, 
  UserRoundUserRoundOff, 
  UserRoundUserRoundCheck, 
  UserRoundUserRoundCheckOff, 
  UserRoundUserRoundX, 
  UserRoundUserRoundXOff, 
  UserRoundUserRoundPlus, 
  UserRoundUserRoundPlusOff, 
  UserRoundUserRoundMinus, 
  UserRoundUserRoundMinusOff, 
  UserRoundUserRoundDivide, 
  UserRoundUserRoundDivideOff, 
  UserRoundUserRoundPercent, 
  UserRoundUserRoundPercentOff, 
  UserRoundUserRoundHash, 
  UserRoundUserRoundHashOff, 
  UserRoundUserRoundAtSign, 
  UserRoundUserRoundAtSignOff, 
  UserRoundUserRoundSlash, 
  UserRoundUserRoundSlashOff, 
  UserRoundUserRoundBackslash, 
  UserRoundUserRoundBackslashOff, 
  UserRoundUserRoundPipe, 
  UserRoundUserRoundPipeOff, 
  UserRoundUserRoundArrowUp, 
  UserRoundUserRoundArrowUpOff, 
  UserRoundUserRoundArrowDown, 
  UserRoundUserRoundArrowDownOff, 
  UserRoundUserRoundArrowLeft, 
  UserRoundUserRoundArrowLeftOff, 
  UserRoundUserRoundArrowRight, 
  UserRoundUserRoundArrowRightOff, 
  UserRoundUserRoundArrowUpRight, 
  UserRoundUserRoundArrowUpRightOff, 
  UserRoundUserRoundArrowUpLeft, 
  UserRoundUserRoundArrowUpLeftOff, 
  UserRoundUserRoundArrowDownRight, 
  UserRoundUserRoundArrowDownRightOff, 
  UserRoundUserRoundArrowDownLeft, 
  UserRoundUserRoundArrowDownLeftOff, 
  UserRoundUserRoundChevronUp, 
  UserRoundUserRoundChevronUpOff, 
  UserRoundUserRoundChevronLeft, 
  UserRoundUserRoundChevronLeftOff, 
  UserRoundUserRoundChevronRight, 
  UserRoundUserRoundChevronRightOff, 
  UserRoundUserRoundMove, 
  UserRoundUserRoundMoveOff, 
  UserRoundUserRoundRotateCw, 
  UserRoundUserRoundRotateCwOff, 
  UserRoundUserRoundRotateCcw, 
  UserRoundUserRoundRotateCcwOff, 
  UserRoundUserRoundFlipHorizontal, 
  UserRoundUserRoundFlipHorizontalOff, 
  UserRoundUserRoundFlipVertical, 
  UserRoundUserRoundFlipVerticalOff, 
  UserRoundUserRoundCrop, 
  UserRoundUserRoundCropOff, 
  UserRoundUserRoundScissors, 
  UserRoundUserRoundScissorsOff, 
  UserRoundUserRoundType, 
  UserRoundUserRoundTypeOff, 
  UserRoundUserRoundBold, 
  UserRoundUserRoundBoldOff, 
  UserRoundUserRoundItalic, 
  UserRoundUserRoundItalicOff, 
  UserRoundUserRoundUnderline, 
  UserRoundUserRoundUnderlineOff, 
  UserRoundUserRoundStrikethrough, 
  UserRoundUserRoundStrikethroughOff, 
  UserRoundUserRoundAlignLeft, 
  UserRoundUserRoundAlignLeftOff, 
  UserRoundUserRoundAlignCenter, 
  UserRoundUserRoundAlignCenterOff, 
  UserRoundUserRoundAlignRight, 
  UserRoundUserRoundAlignRightOff, 
  UserRoundUserRoundAlignJustify, 
  UserRoundUserRoundAlignJustifyOff, 
  UserRoundUserRoundIndent, 
  UserRoundUserRoundIndentOff, 
  UserRoundUserRoundOutdent, 
  UserRoundUserRoundOutdentOff, 
  UserRoundUserRoundListOrdered, 
  UserRoundUserRoundListOrderedOff, 
  UserRoundUserRoundListUnordered, 
  UserRoundUserRoundListUnorderedOff, 
  UserRoundUserRoundQuote, 
  UserRoundUserRoundQuoteOff, 
  UserRoundUserRoundCode, 
  UserRoundUserRoundCodeOff, 
  UserRoundUserRoundImage, 
  UserRoundUserRoundImageOff, 
  UserRoundUserRoundFile, 
  UserRoundUserRoundFileOff, 
  UserRoundUserRoundFolder, 
  UserRoundUserRoundFolderOff, 
  UserRoundUserRoundFolderOpen, 
  UserRoundUserRoundFolderOpenOff, 
  UserRoundUserRoundArchive, 
  UserRoundUserRoundArchiveOff, 
  UserRoundUserRoundPackage, 
  UserRoundUserRoundPackageOff, 
  UserRoundUserRoundBox, 
  UserRoundUserRoundBoxOff, 
  UserRoundUserRoundPackageOpen, 
  UserRoundUserRoundPackageOpenOff, 
  UserRoundUserRoundTruck, 
  UserRoundUserRoundTruckOff, 
  UserRoundUserRoundSend, 
  UserRoundUserRoundSendOff, 
  UserRoundUserRoundPaperclip, 
  UserRoundUserRoundPaperclipOff, 
  UserRoundUserRoundLink2, 
  UserRoundUserRoundLink2Off, 
  UserRoundUserRoundUnlink2, 
  UserRoundUserRoundUnlink2Off, 
  UserRoundUserRoundEye2, 
  UserRoundUserRoundEye2Off, 
  UserRoundUserRoundScan, 
  UserRoundUserRoundScanOff, 
  UserRoundUserRoundScanLine, 
  UserRoundUserRoundScanLineOff, 
  UserRoundUserRoundScanFace, 
  UserRoundUserRoundScanFaceOff, 
  UserRoundUserRoundFingerprint, 
  UserRoundUserRoundFingerprintOff, 
  UserRoundUserRoundKeyRound, 
  UserRoundUserRoundKeyRoundOff, 
  UserRoundUserRoundLockRound, 
  UserRoundUserRoundLockRoundOff, 
  UserRoundUserRoundUnlockRound, 
  UserRoundUserRoundUnlockRoundOff, 
  UserRoundUserRoundShieldCheck, 
  UserRoundUserRoundShieldCheckOff, 
  UserRoundUserRoundShieldX, 
  UserRoundUserRoundShieldXOff, 
  UserRoundUserRoundShieldAlert, 
  UserRoundUserRoundShieldAlertOff, 
  UserRoundUserRoundShieldQuestion, 
  UserRoundUserRoundShieldQuestionOff, 
  UserRoundUserRoundUserRound, 
  UserRoundUserRoundUserRoundOff, 
  UserRoundUserRoundUserRoundCheck, 
  UserRoundUserRoundUserRoundCheckOff, 
  UserRoundUserRoundUserRoundX, 
  UserRoundUserRoundUserRoundXOff, 
  UserRoundUserRoundUserRoundPlus, 
  UserRoundUserRoundUserRoundPlusOff, 
  UserRoundUserRoundUserRoundMinus, 
  UserRoundUserRoundUserRoundMinusOff, 
  UserRoundUserRoundUserRoundDivide, 
  UserRoundUserRoundUserRoundDivideOff, 
  UserRoundUserRoundUserRoundPercent, 
  UserRoundUserRoundUserRoundPercentOff, 
  UserRoundUserRoundUserRoundHash, 
  UserRoundUserRoundUserRoundHashOff, 
  UserRoundUserRoundUserRoundAtSign, 
  UserRoundUserRoundUserRoundAtSignOff, 
  UserRoundUserRoundUserRoundSlash, 
  UserRoundUserRoundUserRoundSlashOff, 
  UserRoundUserRoundUserRoundBackslash, 
  UserRoundUserRoundUserRoundBackslashOff, 
  UserRoundUserRoundUserRoundPipe, 
  UserRoundUserRoundUserRoundPipeOff, 
  UserRoundUserRoundUserRoundArrowUp, 
  UserRoundUserRoundUserRoundArrowUpOff, 
  UserRoundUserRoundUserRoundArrowDown, 
  UserRoundUserRoundUserRoundArrowDownOff, 
  UserRoundUserRoundUserRoundArrowLeft, 
  UserRoundUserRoundUserRoundArrowLeftOff, 
  UserRoundUserRoundUserRoundArrowRight, 
  UserRoundUserRoundUserRoundArrowRightOff, 
  UserRoundUserRoundUserRoundArrowUpRight, 
  UserRoundUserRoundUserRoundArrowUpRightOff, 
  UserRoundUserRoundUserRoundArrowUpLeft, 
  UserRoundUserRoundUserRoundArrowUpLeftOff, 
  UserRoundUserRoundUserRoundArrowDownRight, 
  UserRoundUserRoundUserRoundArrowDownRightOff, 
  UserRoundUserRoundUserRoundArrowDownLeft, 
  UserRoundUserRoundUserRoundArrowDownLeftOff, 
  UserRoundUserRoundUserRoundChevronUp, 
  UserRoundUserRoundUserRoundChevronUpOff, 
  UserRoundUserRoundUserRoundChevronLeft, 
  UserRoundUserRoundUserRoundChevronLeftOff, 
  UserRoundUserRoundUserRoundChevronRight, 
  UserRoundUserRoundUserRoundChevronRightOff, 
  UserRoundUserRoundUserRoundMove, 
  UserRoundUserRoundUserRoundMoveOff, 
  UserRoundUserRoundUserRoundRotateCw, 
  UserRoundUserRoundUserRoundRotateCwOff, 
  UserRoundUserRoundUserRoundRotateCcw, 
  UserRoundUserRoundUserRoundRotateCcwOff, 
  UserRoundUserRoundUserRoundFlipHorizontal, 
  UserRoundUserRoundUserRoundFlipHorizontalOff, 
  UserRoundUserRoundUserRoundFlipVertical, 
  UserRoundUserRoundUserRoundFlipVerticalOff, 
  UserRoundUserRoundUserRoundCrop, 
  UserRoundUserRoundUserRoundCropOff, 
  UserRoundUserRoundUserRoundScissors, 
  UserRoundUserRoundUserRoundScissorsOff, 
  UserRoundUserRoundUserRoundType, 
  UserRoundUserRoundUserRoundTypeOff, 
  UserRoundUserRoundUserRoundBold, 
  UserRoundUserRoundUserRoundBoldOff, 
  UserRoundUserRoundUserRoundItalic, 
  UserRoundUserRoundUserRoundItalicOff, 
  UserRoundUserRoundUserRoundUnderline, 
  UserRoundUserRoundUserRoundUnderlineOff, 
  UserRoundUserRoundUserRoundStrikethrough, 
  UserRoundUserRoundUserRoundStrikethroughOff, 
  UserRoundUserRoundUserRoundAlignLeft, 
  UserRoundUserRoundUserRoundAlignLeftOff, 
  UserRoundUserRoundUserRoundAlignCenter, 
  UserRoundUserRoundUserRoundAlignCenterOff, 
  UserRoundUserRoundUserRoundAlignRight, 
  UserRoundUserRoundUserRoundAlignRightOff, 
  UserRoundUserRoundUserRoundAlignJustify, 
  UserRoundUserRoundUserRoundAlignJustifyOff, 
  UserRoundUserRoundUserRoundIndent, 
  UserRoundUserRoundUserRoundIndentOff, 
  UserRoundUserRoundUserRoundOutdent, 
  UserRoundUserRoundUserRoundOutdentOff, 
  UserRoundUserRoundUserRoundListOrdered, 
  UserRoundUserRoundUserRoundListOrderedOff, 
  UserRoundUserRoundUserRoundListUnordered, 
  UserRoundUserRoundUserRoundListUnorderedOff, 
  UserRoundUserRoundUserRoundQuote, 
  UserRoundUserRoundUserRoundQuoteOff, 
  UserRoundUserRoundUserRoundCode, 
  UserRoundUserRoundUserRoundCodeOff, 
  UserRoundUserRoundUserRoundImage, 
  UserRoundUserRoundUserRoundImageOff, 
  UserRoundUserRoundUserRoundFile, 
  UserRoundUserRoundUserRoundFileOff, 
  UserRoundUserRoundUserRoundFolder, 
  UserRoundUserRoundUserRoundFolderOff, 
  UserRoundUserRoundUserRoundFolderOpen, 
  UserRoundUserRoundUserRoundFolderOpenOff, 
  UserRoundUserRoundUserRoundArchive, 
  UserRoundUserRoundUserRoundArchiveOff, 
  UserRoundUserRoundUserRoundPackage, 
  UserRoundUserRoundUserRoundPackageOff, 
  UserRoundUserRoundUserRoundBox, 
  UserRoundUserRoundUserRoundBoxOff, 
  UserRoundUserRoundUserRoundPackageOpen, 
  UserRoundUserRoundUserRoundPackageOpenOff, 
  UserRoundUserRoundUserRoundTruck, 
  UserRoundUserRoundUserRoundTruckOff, 
  UserRoundUserRoundUserRoundSend, 
  UserRoundUserRoundUserRoundSendOff, 
  UserRoundUserRoundUserRoundPaperclip, 
  UserRoundUserRoundUserRoundPaperclipOff, 
  UserRoundUserRoundUserRoundLink2, 
  UserRoundUserRoundUserRoundLink2Off, 
  UserRoundUserRoundUserRoundUnlink2, 
  UserRoundUserRoundUserRoundUnlink2Off, 
  UserRoundUserRoundUserRoundEye2, 
  UserRoundUserRoundUserRoundEye2Off, 
  UserRoundUserRoundUserRoundScan, 
  UserRoundUserRoundUserRoundScanOff, 
  UserRoundUserRoundUserRoundScanLine, 
  UserRoundUserRoundUserRoundScanLineOff, 
  UserRoundUserRoundUserRoundScanFace, 
  UserRoundUserRoundUserRoundScanFaceOff, 
  UserRoundUserRoundUserRoundFingerprint, 
  UserRoundUserRoundUserRoundFingerprintOff, 
  UserRoundUserRoundUserRoundKeyRound, 
  UserRoundUserRoundUserRoundKeyRoundOff, 
  UserRoundUserRoundUserRoundLockRound, 
  UserRoundUserRoundUserRoundLockRoundOff, 
  UserRoundUserRoundUserRoundUnlockRound, 
  UserRoundUserRoundUserRoundUnlockRoundOff, 
  UserRoundUserRoundUserRoundShieldCheck, 
  UserRoundUserRoundUserRoundShieldCheckOff, 
  UserRoundUserRoundUserRoundShieldX, 
  UserRoundUserRoundUserRoundShieldXOff, 
  UserRoundUserRoundUserRoundShieldAlert, 
  UserRoundUserRoundUserRoundShieldAlertOff, 
  UserRoundUserRoundUserRoundShieldQuestion, 
  UserRoundUserRoundUserRoundShieldQuestionOff, 
  UserRoundUserRoundUserRoundUserRound, 
  UserRoundUserRoundUserRoundUserRoundOff, 
  UserRoundUserRoundUserRoundUserRoundCheck, 
  UserRoundUserRoundUserRoundUserRoundCheckOff, 
  UserRoundUserRoundUserRoundUserRoundX, 
  UserRoundUserRoundUserRoundUserRoundXOff, 
  UserRoundUserRoundUserRoundUserRoundPlus, 
  UserRoundUserRoundUserRoundUserRoundPlusOff, 
  UserRoundUserRoundUserRoundUserRoundMinus, 
  UserRoundUserRoundUserRoundUserRoundMinusOff, 
  UserRoundUserRoundUserRoundUserRoundDivide, 
  UserRoundUserRoundUserRoundUserRoundDivideOff, 
  UserRoundUserRoundUserRoundUserRoundPercent, 
  UserRoundUserRoundUserRoundUserRoundPercentOff, 
  UserRoundUserRoundUserRoundUserRoundHash, 
  UserRoundUserRoundUserRoundUserRoundHashOff, 
  UserRoundUserRoundUserRoundUserRoundAtSign, 
  UserRoundUserRoundUserRoundUserRoundAtSignOff, 
  UserRoundUserRoundUserRoundUserRoundSlash, 
  UserRoundUserRoundUserRoundUserRoundSlashOff, 
  UserRoundUserRoundUserRoundUserRoundBackslash, 
  UserRoundUserRoundUserRoundUserRoundBackslashOff, 
  UserRoundUserRoundUserRoundUserRoundPipe, 
  UserRoundUserRoundUserRoundUserRoundPipeOff, 
  UserRoundUserRoundUserRoundUserRoundArrowUp, 
  UserRoundUserRoundUserRoundUserRoundArrowUpOff, 
  UserRoundUserRoundUserRoundUserRoundArrowDown, 
  UserRoundUserRoundUserRoundUserRoundArrowDownOff, 
  UserRoundUserRoundUserRoundUserRoundArrowLeft, 
  UserRoundUserRoundUserRoundUserRoundArrowLeftOff, 
  UserRoundUserRoundUserRoundUserRoundArrowRight, 
  UserRoundUserRoundUserRoundUserRoundArrowRightOff, 
  UserRoundUserRoundUserRoundUserRoundArrowUpRight, 
  UserRoundUserRoundUserRoundUserRoundArrowUpRightOff, 
  UserRoundUserRoundUserRoundUserRoundArrowUpLeft, 
  UserRoundUserRoundUserRoundUserRoundArrowUpLeftOff, 
  UserRoundUserRoundUserRoundUserRoundArrowDownRight, 
  UserRoundUserRoundUserRoundUserRoundArrowDownRightOff, 
  UserRoundUserRoundUserRoundUserRoundArrowDownLeft, 
  UserRoundUserRoundUserRoundUserRoundArrowDownLeftOff, 
  UserRoundUserRoundUserRoundUserRoundChevronUp, 
  UserRoundUserRoundUserRoundUserRoundChevronUpOff, 
  UserRoundUserRoundUserRoundUserRoundChevronLeft, 
  UserRoundUserRoundUserRoundUserRoundChevronLeftOff, 
  UserRoundUserRoundUserRoundUserRoundChevronRight, 
  UserRoundUserRoundUserRoundUserRoundChevronRightOff, 
  UserRoundUserRoundUserRoundUserRoundMove, 
  UserRoundUserRoundUserRoundUserRoundMoveOff, 
  UserRoundUserRoundUserRoundUserRoundRotateCw, 
  UserRoundUserRoundUserRoundUserRoundRotateCwOff, 
  UserRoundUserRoundUserRoundUserRoundRotateCcw, 
  UserRoundUserRoundUserRoundUserRoundRotateCcwOff, 
  UserRoundUserRoundUserRoundUserRoundFlipHorizontal, 
  UserRoundUserRoundUserRoundUserRoundFlipHorizontalOff, 
  UserRoundUserRoundUserRoundUserRoundFlipVertical, 
  UserRoundUserRoundUserRoundUserRoundFlipVerticalOff, 
  UserRoundUserRoundUserRoundUserRoundCrop, 
  UserRoundUserRoundUserRoundUserRoundCropOff, 
  UserRoundUserRoundUserRoundUserRoundScissors, 
  UserRoundUserRoundUserRoundUserRoundScissorsOff, 
  UserRoundUserRoundUserRoundUserRoundType, 
  UserRoundUserRoundUserRoundUserRoundTypeOff, 
  UserRoundUserRoundUserRoundUserRoundBold, 
  UserRoundUserRoundUserRoundUserRoundBoldOff, 
  UserRoundUserRoundUserRoundUserRoundItalic, 
  UserRoundUserRoundUserRoundUserRoundItalicOff, 
  UserRoundUserRoundUserRoundUserRoundUnderline, 
  UserRoundUserRoundUserRoundUserRoundUnderlineOff, 
  UserRoundUserRoundUserRoundUserRoundStrikethrough, 
  UserRoundUserRoundUserRoundUserRoundStrikethroughOff, 
  UserRoundUserRoundUserRoundUserRoundAlignLeft, 
  UserRoundUserRoundUserRoundUserRoundAlignLeftOff, 
  UserRoundUserRoundUserRoundUserRoundAlignCenter, 
  UserRoundUserRoundUserRoundUserRoundAlignCenterOff, 
  UserRoundUserRoundUserRoundUserRoundAlignRight, 
  UserRoundUserRoundUserRoundUserRoundAlignRightOff, 
  UserRoundUserRoundUserRoundUserRoundAlignJustify, 
  UserRoundUserRoundUserRoundUserRoundAlignJustifyOff, 
  UserRoundUserRoundUserRoundUserRoundIndent, 
  UserRoundUserRoundUserRoundUserRoundIndentOff, 
  UserRoundUserRoundUserRoundUserRoundOutdent, 
  UserRoundUserRoundUserRoundUserRoundOutdentOff, 
  UserRoundUserRoundUserRoundUserRoundListOrdered, 
  UserRoundUserRoundUserRoundUserRoundListOrderedOff, 
  UserRoundUserRoundUserRoundUserRoundListUnordered, 
  UserRoundUserRoundUserRoundUserRoundListUnorderedOff, 
  UserRoundUserRoundUserRoundUserRoundQuote, 
  UserRoundUserRoundUserRoundUserRoundQuoteOff, 
  UserRoundUserRoundUserRoundUserRoundCode, 
  UserRoundUserRoundUserRoundUserRoundCodeOff, 
  UserRoundUserRoundUserRoundUserRoundImage, 
  UserRoundUserRoundUserRoundUserRoundImageOff, 
  UserRoundUserRoundUserRoundUserRoundFile, 
  UserRoundUserRoundUserRoundUserRoundFileOff, 
  UserRoundUserRoundUserRoundUserRoundFolder, 
  UserRoundUserRoundUserRoundUserRoundFolderOff, 
  UserRoundUserRoundUserRoundUserRoundFolderOpen, 
  UserRoundUserRoundUserRoundUserRoundFolderOpenOff, 
  UserRoundUserRoundUserRoundUserRoundArchive, 
  UserRoundUserRoundUserRoundUserRoundArchiveOff, 
  UserRoundUserRoundUserRoundUserRoundPackage, 
  UserRoundUserRoundUserRoundUserRoundPackageOff, 
  UserRoundUserRoundUserRoundUserRoundBox, 
  UserRoundUserRoundUserRoundUserRoundBoxOff, 
  UserRoundUserRoundUserRoundUserRoundPackageOpen, 
  UserRoundUserRoundUserRoundUserRoundPackageOpenOff, 
  UserRoundUserRoundUserRoundUserRoundTruck, 
  UserRoundUserRoundUserRoundUserRoundTruckOff, 
  UserRoundUserRoundUserRoundUserRoundSend, 
  UserRoundUserRoundUserRoundUserRoundSendOff, 
  UserRoundUserRoundUserRoundUserRoundPaperclip, 
  UserRoundUserRoundUserRoundUserRoundPaperclipOff, 
  UserRoundUserRoundUserRoundUserRoundLink2, 
  UserRoundUserRoundUserRoundUserRoundLink2Off, 
  UserRoundUserRoundUserRoundUserRoundUnlink2, 
  UserRoundUserRoundUserRoundUserRoundUnlink2Off, 
  UserRoundUserRoundUserRoundUserRoundEye2, 
  UserRoundUserRoundUserRoundUserRoundEye2Off, 
  UserRoundUserRoundUserRoundUserRoundScan, 
  UserRoundUserRoundUserRoundUserRoundScanOff, 
  UserRoundUserRoundUserRoundUserRoundScanLine, 
  UserRoundUserRoundUserRoundUserRoundScanLineOff, 
  UserRoundUserRoundUserRoundUserRoundScanFace, 
  UserRoundUserRoundUserRoundUserRoundScanFaceOff, 
  UserRoundUserRoundUserRoundUserRoundFingerprint, 
  UserRoundUserRoundUserRoundUserRoundFingerprintOff, 
  UserRoundUserRoundUserRoundUserRoundKeyRound, 
  UserRoundUserRoundUserRoundUserRoundKeyRoundOff, 
  UserRoundUserRoundUserRoundUserRoundLockRound, 
  UserRoundUserRoundUserRoundUserRoundLockRoundOff, 
  UserRoundUserRoundUserRoundUserRoundUnlockRound, 
  UserRoundUserRoundUserRoundUserRoundUnlockRoundOff, 
  UserRoundUserRoundUserRoundUserRoundShieldCheck, 
  UserRoundUserRoundUserRoundUserRoundShieldCheckOff, 
  UserRoundUserRoundUserRoundUserRoundShieldX, 
  UserRoundUserRoundUserRoundUserRoundShieldXOff, 
  UserRoundUserRoundUserRoundUserRoundShieldAlert, 
  UserRoundUserRoundUserRoundUserRoundShieldAlertOff, 
  UserRoundUserRoundUserRoundUserRoundShieldQuestion, 
  UserRoundUserRoundUserRoundUserRoundShieldQuestionOff
} from 'lucide-react';

interface VoiceCommand {
  id: string;
  command: string;
  keywords: string[];
  action: string;
  parameters?: string[];
  category: 'playback' | 'navigation' | 'search' | 'system' | 'custom';
  confidence: number;
  language: string;
  enabled: boolean;
  customActions?: {
    [action: string]: () => void;
  };
}

interface VoiceSettings {
  enabled: boolean;
  language: string;
  accent: string;
  sensitivity: number;
  wakeWord: string;
  continuousListening: boolean;
  autoStop: boolean;
  confirmationFeedback: boolean;
  customCommands: boolean;
  smartAssistant: 'none' | 'siri' | 'google' | 'alexa' | 'cortana' | 'custom';
  privacy: {
    storeRecordings: boolean;
    shareData: boolean;
    localProcessing: boolean;
  };
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  timestamp: Date;
  command?: VoiceCommand;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  processingTime: number;
  language: string;
}

interface SmartAssistant {
  name: string;
  enabled: boolean;
  capabilities: string[];
  integration: {
    apiKey?: string;
    endpoint?: string;
    version?: string;
  };
  customCommands: {
    [command: string]: {
      description: string;
      action: string;
      parameters?: string[];
    };
  };
}

export default function VoiceControlIntegration() {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: false,
    language: 'en-US',
    accent: 'us',
    sensitivity: 0.7,
    wakeWord: 'Hey ACE',
    continuousListening: false,
    autoStop: true,
    confirmationFeedback: true,
    customCommands: false,
    smartAssistant: 'none',
    privacy: {
      storeRecordings: false,
      shareData: false,
      localProcessing: true
    }
  });
  const [availableCommands, setAvailableCommands] = useState<VoiceCommand[]>([]);
  const [recognitionResult, setRecognitionResult] = useState<VoiceRecognitionResult | null>(null);
  const [smartAssistant, setSmartAssistant] = useState<SmartAssistant | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandEditor, setShowCommandEditor] = useState(false);
  const [customCommand, setCustomCommand] = useState({
    command: '',
    keywords: [],
    action: '',
    category: 'custom' as const
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mock data - replace with actual API calls
  const mockCommands: VoiceCommand[] = [
    {
      id: 'play_pause',
      command: 'play / pause',
      keywords: ['play', 'pause', 'stop', 'resume'],
      action: 'toggle_playback',
      category: 'playback',
      confidence: 0.95,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'next',
      command: 'next',
      keywords: ['next', 'skip', 'forward'],
      action: 'next_track',
      category: 'playback',
      confidence: 0.92,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'previous',
      command: 'previous',
      keywords: ['previous', 'back', 'rewind'],
      action: 'previous_track',
      category: 'playback',
      confidence: 0.90,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'volume_up',
      command: 'volume up',
      keywords: ['volume up', 'louder', 'increase volume'],
      action: 'increase_volume',
      category: 'playback',
      confidence: 0.88,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'volume_down',
      command: 'volume down',
      keywords: ['volume down', 'quieter', 'decrease volume'],
      action: 'decrease_volume',
      category: 'playback',
      confidence: 0.87,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'mute',
      command: 'mute',
      keywords: ['mute', 'silence', 'quiet'],
      action: 'toggle_mute',
      category: 'playback',
      confidence: 0.93,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'fullscreen',
      command: 'fullscreen',
      keywords: ['fullscreen', 'full screen', 'maximize'],
      action: 'toggle_fullscreen',
      category: 'playback',
      confidence: 0.91,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'search',
      command: 'search',
      keywords: ['search', 'find', 'look for'],
      action: 'open_search',
      parameters: ['query'],
      category: 'search',
      confidence: 0.85,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'home',
      command: 'home',
      keywords: ['home', 'main', 'dashboard'],
      action: 'navigate_home',
      category: 'navigation',
      confidence: 0.94,
      language: 'en-US',
      enabled: true
    },
    {
      id: 'settings',
      command: 'settings',
      keywords: ['settings', 'preferences', 'options'],
      action: 'open_settings',
      category: 'system',
      confidence: 0.89,
      language: 'en-US',
      enabled: true
    }
  ];

  const mockSmartAssistant: SmartAssistant = {
    name: 'Custom ACE Assistant',
    enabled: false,
    capabilities: ['voice_commands', 'media_control', 'search', 'navigation'],
    integration: {
      endpoint: '/api/voice/assistant',
      version: '1.0'
    },
    customCommands: {
      'find_movie': {
        description: 'Find a movie by title',
        action: 'search_movies',
        parameters: ['title']
      },
      'play_genre': {
        description: 'Play movies from a specific genre',
        action: 'play_genre',
        parameters: ['genre']
      },
      'show_watchlist': {
        description: 'Show my watchlist',
        action: 'open_watchlist',
        parameters: []
      }
    }
  };

  useEffect(() => {
    if (isVoiceEnabled) {
      initializeVoiceRecognition();
      loadVoiceCommands();
    }
  }, [isVoiceEnabled]);

  const initializeVoiceRecognition = async () => {
    try {
      // Check for browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setError('Voice recognition is not supported in this browser');
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = voiceSettings.continuousListening;
      recognition.interimResults = false;
      recognition.lang = voiceSettings.language;
      recognition.maxAlternatives = 3;
      
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };
      
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const confidence = event.results[last][0].confidence;
        
        const result: VoiceRecognitionResult = {
          transcript,
          confidence,
          timestamp: new Date(),
          alternatives: Array.from(event.results[last]).map((result: any) => ({
            transcript: result.transcript,
            confidence: result.confidence
          })),
          processingTime: Date.now() - event.timeStamp,
          language: voiceSettings.language
        };
        
        setRecognitionResult(result);
        processVoiceCommand(transcript, confidence);
      };
      
      recognition.onerror = (event: any) => {
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Failed to initialize voice recognition:', error);
      setError('Failed to initialize voice recognition');
    }
  };

  const loadVoiceCommands = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAvailableCommands(mockCommands);
      setSmartAssistant(mockSmartAssistant);
    } catch (error) {
      console.error('Failed to load voice commands:', error);
      setError('Failed to load voice commands');
    } finally {
      setIsLoading(false);
    }
  };

  const processVoiceCommand = (transcript: string, confidence: number) => {
    const lowerTranscript = transcript.toLowerCase();
    
    // Find matching command
    const matchedCommand = availableCommands.find(cmd => 
      cmd.keywords.some(keyword => lowerTranscript.includes(keyword)) && 
      confidence >= cmd.confidence
    );
    
    if (matchedCommand) {
      executeCommand(matchedCommand);
    } else {
      // Check custom commands
      const customMatch = smartAssistant?.customCommands && 
        Object.entries(smartAssistant.customCommands).find(([key, cmd]) => 
          lowerTranscript.includes(key.toLowerCase())
        );
      
      if (customMatch) {
        executeCustomCommand(customMatch[0], customMatch[1]);
      }
    }
  };

  const executeCommand = (command: VoiceCommand) => {
    console.log('Executing voice command:', command);
    
    // Dispatch custom event for the main app to handle
    window.dispatchEvent(new CustomEvent('voiceCommand', { 
      detail: { 
        command: command.action,
        parameters: command.parameters,
        confidence: command.confidence
      } 
    }));
  };

  const executeCustomCommand = (command: string, config: any) => {
    console.log('Executing custom command:', command, config);
    
    // Dispatch custom command event
    window.dispatchEvent(new CustomEvent('customVoiceCommand', { 
      detail: { 
        command,
        config
      } 
    }));
  };

  const handleToggleVoice = () => {
    if (isVoiceEnabled) {
      stopVoiceRecognition();
    } else {
      initializeVoiceRecognition();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleVoiceSettings = (settings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...settings }));
    
    // Restart recognition if it's active
    if (isVoiceEnabled && recognitionRef.current) {
      stopVoiceRecognition();
      setTimeout(() => {
        initializeVoiceRecognition();
      if (settings.enabled !== false) {
        startListening();
      }
      }, 100);
    }
  };

  const handleAddCustomCommand = () => {
    if (!customCommand.command || !customCommand.action) {
      setError('Please provide both command and action');
      return;
    }
    
    const newCommand: VoiceCommand = {
      id: `custom_${Date.now()}`,
      command: customCommand.command,
      keywords: customCommand.keywords,
      action: customCommand.action,
      category: 'custom',
      confidence: 0.8,
      language: voiceSettings.language,
      enabled: true
    };
    
    setAvailableCommands(prev => [...prev, newCommand]);
    setCustomCommand({ command: '', keywords: [], action: '', category: 'custom' });
    setShowCommandEditor(false);
  };

  const handleDeleteCommand = (commandId: string) => {
    setAvailableCommands(prev => prev.filter(cmd => cmd.id !== commandId));
  };

  const handleToggleCommand = (commandId: string) => {
    setAvailableCommands(prev => 
      prev.map(cmd => 
        cmd.id === commandId ? { ...cmd, enabled: !cmd.enabled } : cmd
      )
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'playback': return <Play className="w-4 h-4" />;
      case 'navigation': return <Home className="w-4 h-4" />;
      case 'search': return <Search className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      case 'custom': return <Brain className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  const getAssistantIcon = (assistant: string) => {
    switch (assistant) {
      case 'siri': return <Zap className="w-4 h-4" />;
      case 'google': return <Brain className="w-4 h-4" />;
      case 'alexa': return <Crown className="w-4 h-4" />;
      case 'cortana': return <Sparkles className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  return (
    <div className="voice-control-integration">
      {/* Header */}
      <div className="voice-header">
        <div className="header-content">
          <h1 className="header-title">Voice Control Integration</h1>
          <p className="header-subtitle">Control ACE Studio with your voice using smart assistants and custom commands</p>
        </div>
        
        <div className="header-actions">
          <div className="voice-status">
            <div className={`status-indicator ${isVoiceEnabled ? 'active' : ''}`}>
              <Mic className={`w-6 h-6 ${isListening ? 'listening' : ''}`} />
              <span className={`status-text ${isListening ? 'listening' : ''}`}>
                {isListening ? 'Listening...' : isVoiceEnabled ? 'Voice Ready' : 'Voice Off'}
              </span>
            </div>
            
            <button
              className={`voice-toggle ${isVoiceEnabled ? 'enabled' : ''}`}
              onClick={handleToggleVoice}
            >
              {isVoiceEnabled ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Enable</span>
                </>
              )}
            </button>
          </div>
          
          <button
            className="settings-button"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isVoiceEnabled ? (
        <div className="voice-content">
          {/* Voice Recognition Result */}
          {recognitionResult && (
            <div className="recognition-result">
              <div className="result-header">
                <Mic className="w-5 h-5" />
                <span className="result-label">Voice Recognition</span>
                <span className="confidence-badge">
                  Confidence: {Math.round(recognitionResult.confidence * 100)}%
                </span>
              </div>
              
              <div className="result-content">
                <div className="transcript">
                  <span className="transcript-text">"{recognitionResult.transcript}"</span>
                  <span className="transcript-time">
                    {recognitionResult.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                {recognitionResult.alternatives.length > 0 && (
                  <div className="alternatives">
                    <h4 className="alternatives-title">Alternatives:</h4>
                    <div className="alternatives-list">
                      {recognitionResult.alternatives.map((alt, index) => (
                        <div key={index} className="alternative-item">
                          <span className="alternative-text">{alt.transcript}</span>
                          <span className="alternative-confidence">
                            {Math.round(alt.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="voice-settings">
              <div className="settings-header">
                <h2 className="settings-title">Voice Settings</h2>
                <button
                  className="close-settings"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">Language</label>
                  <select
                    value={voiceSettings.language}
                    onChange={(e) => handleVoiceSettings({ language: e.target.value })}
                    className="setting-select"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="fr-FR">French (France)</option>
                    <option value="de-DE">German (Germany)</option>
                    <option value="it-IT">Italian (Italy)</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="ja-JP">Japanese (Japan)</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                  </select>
                </div>
                
                <div className="setting-item">
                  <label className="setting-label">Wake Word</label>
                  <input
                    type="text"
                    value={voiceSettings.wakeWord}
                    onChange={(e) => handleVoiceSettings({ wakeWord: e.target.value })}
                    className="setting-input"
                    placeholder="e.g., Hey ACE"
                  />
                </div>
                
                <div className="setting-item">
                  <label className="setting-label">Sensitivity</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={voiceSettings.sensitivity}
                      onChange={(e) => handleVoiceSettings({ sensitivity: parseFloat(e.target.value) })}
                      className="slider-input"
                    />
                    <span className="slider-value">{(voiceSettings.sensitivity * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="setting-item">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={voiceSettings.continuousListening}
                      onChange={(e) => handleVoiceSettings({ continuousListening: e.target.checked })}
                    />
                    <span className="toggle-text">Continuous Listening</span>
                  </label>
                </div>
                
                <div className="setting-item">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={voiceSettings.confirmationFeedback}
                      onChange={(e) => handleVoiceSettings({ confirmationFeedback: e.target.checked })}
                    />
                    <span className="toggle-text">Confirmation Feedback</span>
                  </label>
                </div>
                
                <div className="setting-item">
                  <label className="setting-label">Smart Assistant</label>
                  <select
                    value={voiceSettings.smartAssistant}
                    onChange={(e) => handleVoiceSettings({ smartAssistant: e.target.value as any })}
                    className="setting-select"
                  >
                    <option value="none">None</option>
                    <option value="siri">Siri</option>
                    <option value="google">Google Assistant</option>
                    <option value="alexa">Amazon Alexa</option>
                    <option value="cortana">Microsoft Cortana</option>
                    <option value="custom">Custom Assistant</option>
                  </select>
                </div>
                
                <div className="setting-item">
                  <h3 className="setting-subtitle">Privacy Settings</h3>
                  
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={voiceSettings.privacy.storeRecordings}
                      onChange={(e) => handleVoiceSettings({ 
                        privacy: { ...voiceSettings.privacy, storeRecordings: e.target.checked }
                      })}
                    />
                    <span className="toggle-text">Store Voice Recordings</span>
                  </label>
                  
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={voiceSettings.privacy.shareData}
                      onChange={(e) => handleVoiceSettings({ 
                        privacy: { ...voiceSettings.privacy, shareData: e.target.checked }
                      })}
                    />
                    <span className="toggle-text">Share Usage Data</span>
                  </label>
                  
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={voiceSettings.privacy.localProcessing}
                      onChange={(e) => handleVoiceSettings({ 
                        privacy: { ...voiceSettings.privacy, localProcessing: e.target.checked }
                      })}
                    />
                    <span className="toggle-text">Local Processing Only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Voice Commands */}
          <div className="voice-commands">
            <div className="commands-header">
              <h2 className="commands-title">Voice Commands</h2>
              <button
                className="add-command-button"
                onClick={() => setShowCommandEditor(true)}
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom</span>
              </button>
            </div>
            
            <div className="commands-grid">
              {availableCommands.map((command) => (
                <div key={command.id} className="command-card">
                  <div className="command-header">
                    <div className="command-icon">
                      {getCategoryIcon(command.category)}
                    </div>
                    <div className="command-info">
                      <h3 className="command-name">{command.command}</h3>
                      <span className="command-category">{command.category}</span>
                    </div>
                    <div className="command-controls">
                      <button
                        className={`toggle-button ${command.enabled ? 'enabled' : ''}`}
                        onClick={() => handleToggleCommand(command.id)}
                      >
                        {command.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="command-details">
                    <div className="detail-item">
                      <span className="detail-label">Keywords:</span>
                      <div className="keywords-list">
                        {command.keywords.map((keyword, index) => (
                          <span key={index} className="keyword-tag">{keyword}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Action:</span>
                      <span className="detail-value">{command.action}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Language:</span>
                      <span className="detail-value">{command.language}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Confidence:</span>
                      <div className="confidence-bar">
                        <div 
                          className="confidence-fill"
                          style={{ width: `${command.confidence * 100}%` }}
                        ></div>
                        <span className="confidence-text">{Math.round(command.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="command-status">
                    <div className={`status-indicator ${command.enabled ? 'enabled' : 'disabled'}`}>
                      {command.enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{command.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Assistant */}
          {smartAssistant && voiceSettings.smartAssistant !== 'none' && (
            <div className="smart-assistant">
              <h2 className="assistant-title">Smart Assistant Integration</h2>
              
              <div className="assistant-info">
                <div className="assistant-header">
                  <div className="assistant-icon">
                    {getAssistantIcon(voiceSettings.smartAssistant)}
                  </div>
                  <div className="assistant-details">
                    <h3 className="assistant-name">{smartAssistant.name}</h3>
                    <span className="assistant-status">
                      {smartAssistant.enabled ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="assistant-capabilities">
                <h4 className="capabilities-title">Capabilities:</h4>
                <div className="capabilities-list">
                  {smartAssistant.capabilities.map((capability, index) => (
                    <span key={index} className="capability-tag">{capability}</span>
                  ))}
                </div>
              </div>
              
              {smartAssistant.customCommands && (
                <div className="custom-commands">
                  <h4 className="custom-title">Custom Commands:</h4>
                  <div className="custom-list">
                    {Object.entries(smartAssistant.customCommands).map(([key, config]) => (
                      <div key={key} className="custom-item">
                        <div className="custom-header">
                          <span className="custom-command">{key}</span>
                          <span className="custom-description">{config.description}</span>
                        </div>
                        <div className="custom-action">{config.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="voice-disabled-state">
          <div className="disabled-content">
            <Mic className="w-16 h-16" />
            <h2>Voice Control Disabled</h2>
            <p>Enable voice control to interact with ACE Studio using voice commands and smart assistant integration.</p>
            
            <button
              className="enable-voice-button"
              onClick={handleToggleVoice}
            >
              <Mic className="w-5 h-5" />
              <span>Enable Voice Control</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Command Editor */}
      {showCommandEditor && (
        <div className="command-editor-overlay">
          <div className="command-editor">
            <div className="editor-header">
              <h2 className="editor-title">Add Custom Command</h2>
              <button
                className="close-editor"
                onClick={() => setShowCommandEditor(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="editor-content">
              <div className="editor-section">
                <label className="editor-label">Command</label>
                <input
                  type="text"
                  value={customCommand.command}
                  onChange={(e) => setCustomCommand(prev => ({ ...prev, command: e.target.value }))}
                  className="editor-input"
                  placeholder="e.g., Play next episode"
                />
              </div>
              
              <div className="editor-section">
                <label className="editor-label">Keywords</label>
                <input
                  type="text"
                  value={customCommand.keywords.join(', ')}
                  onChange={(e) => setCustomCommand(prev => ({ 
                    ...prev, 
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                  }))}
                  className="editor-input"
                  placeholder="e.g., next, skip, forward"
                />
                <p className="editor-help">Separate multiple keywords with commas</p>
              </div>
              
              <div className="editor-section">
                <label className="editor-label">Action</label>
                <input
                  type="text"
                  value={customCommand.action}
                  onChange={(e) => setCustomCommand(prev => ({ ...prev, action: e.target.value }))}
                  className="editor-input"
                  placeholder="e.g., next_track"
                />
              </div>
              
              <div className="editor-section">
                <label className="editor-label">Category</label>
                <select
                  value={customCommand.category}
                  onChange={(e) => setCustomCommand(prev => ({ ...prev, category: e.target.value as any }))}
                  className="editor-select"
                >
                  <option value="custom">Custom</option>
                  <option value="playback">Playback</option>
                  <option value="navigation">Navigation</option>
                  <option value="search">Search</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
            
            <div className="editor-actions">
              <button
                className="editor-button secondary"
                onClick={() => setShowCommandEditor(false)}
              >
                Cancel
              </button>
              
              <button
                className="editor-button primary"
                onClick={handleAddCustomCommand}
                disabled={!customCommand.command || !customCommand.action}
              >
                <Plus className="w-4 h-4" />
                <span>Add Command</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
