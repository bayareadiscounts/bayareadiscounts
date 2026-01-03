// Data models for Bay Navigator API
// Matches the static JSON API structure from the main website

class Program {
  final String id;
  final String name;
  final String category;
  final String description;
  final String? fullDescription;
  final String? whatTheyOffer;
  final String? howToGetIt;
  final List<String> groups;
  final List<String> areas;
  final String? city;
  final String website;
  final String? cost;
  final String? phone;
  final String? email;
  final String? address;
  final String? requirements;
  final String? howToApply;
  final String lastUpdated;

  Program({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    this.fullDescription,
    this.whatTheyOffer,
    this.howToGetIt,
    required this.groups,
    required this.areas,
    this.city,
    required this.website,
    this.cost,
    this.phone,
    this.email,
    this.address,
    this.requirements,
    this.howToApply,
    required this.lastUpdated,
  });

  factory Program.fromJson(Map<String, dynamic> json) {
    return Program(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      description: json['description'] as String,
      fullDescription: json['fullDescription'] as String?,
      whatTheyOffer: json['whatTheyOffer'] as String?,
      howToGetIt: json['howToGetIt'] as String?,
      groups: List<String>.from(json['groups'] ?? json['eligibility'] ?? []),
      areas: List<String>.from(json['areas'] ?? []),
      city: json['city'] as String?,
      website: json['website'] as String? ?? '',
      cost: json['cost'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      requirements: json['requirements'] as String?,
      howToApply: json['howToApply'] as String?,
      lastUpdated: json['lastUpdated'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'description': description,
      'fullDescription': fullDescription,
      'whatTheyOffer': whatTheyOffer,
      'howToGetIt': howToGetIt,
      'groups': groups,
      'areas': areas,
      'city': city,
      'website': website,
      'cost': cost,
      'phone': phone,
      'email': email,
      'address': address,
      'requirements': requirements,
      'howToApply': howToApply,
      'lastUpdated': lastUpdated,
    };
  }

  /// Get display description (prefer fullDescription, fallback to description)
  String get displayDescription => fullDescription ?? description;

  /// Get location text for display
  String get locationText {
    if (city != null && city!.isNotEmpty) return city!;
    if (areas.isNotEmpty) return areas.join(', ');
    return 'Bay Area';
  }

  /// Backwards-compatible alias for groups (formerly eligibility)
  List<String> get eligibility => groups;

  /// Parse whatTheyOffer into list items
  List<String> get offerItems {
    if (whatTheyOffer == null || whatTheyOffer!.isEmpty) return [];
    return whatTheyOffer!
        .split('\n')
        .map((line) => line.replaceFirst(RegExp(r'^[\s-]*'), '').trim())
        .where((line) => line.isNotEmpty)
        .toList();
  }

  /// Parse howToGetIt into numbered steps
  List<String> get howToSteps {
    if (howToGetIt == null || howToGetIt!.isEmpty) return [];
    return howToGetIt!
        .split('\n')
        .map((line) => line.replaceFirst(RegExp(r'^\d+\.\s*'), '').trim())
        .where((line) => line.isNotEmpty)
        .toList();
  }
}

class ProgramCategory {
  final String id;
  final String name;
  final String icon;
  final int programCount;

  ProgramCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.programCount,
  });

  factory ProgramCategory.fromJson(Map<String, dynamic> json) {
    return ProgramCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String,
      programCount: json['programCount'] as int,
    );
  }
}

class ProgramGroup {
  final String id;
  final String name;
  final String description;
  final String icon;
  final int programCount;

  ProgramGroup({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.programCount,
  });

  factory ProgramGroup.fromJson(Map<String, dynamic> json) {
    return ProgramGroup(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      icon: json['icon'] as String,
      programCount: json['programCount'] as int,
    );
  }
}

class Area {
  final String id;
  final String name;
  final String type; // 'county' | 'region' | 'state' | 'nationwide'
  final int programCount;

  Area({
    required this.id,
    required this.name,
    required this.type,
    required this.programCount,
  });

  factory Area.fromJson(Map<String, dynamic> json) {
    return Area(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      programCount: json['programCount'] as int,
    );
  }
}

class APIMetadata {
  final String version;
  final String generatedAt;
  final int totalPrograms;

  APIMetadata({
    required this.version,
    required this.generatedAt,
    required this.totalPrograms,
  });

  factory APIMetadata.fromJson(Map<String, dynamic> json) {
    return APIMetadata(
      version: json['version'] as String,
      generatedAt: json['generatedAt'] as String,
      totalPrograms: json['totalPrograms'] as int,
    );
  }
}

class FilterState {
  final List<String> categories;
  final List<String> groups;
  final List<String> areas;
  final String searchQuery;

  FilterState({
    this.categories = const [],
    this.groups = const [],
    this.areas = const [],
    this.searchQuery = '',
  });

  FilterState copyWith({
    List<String>? categories,
    List<String>? groups,
    List<String>? areas,
    String? searchQuery,
  }) {
    return FilterState(
      categories: categories ?? this.categories,
      groups: groups ?? this.groups,
      areas: areas ?? this.areas,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  bool get hasFilters =>
      categories.isNotEmpty ||
      groups.isNotEmpty ||
      areas.isNotEmpty ||
      searchQuery.isNotEmpty;

  // IDs for "Other" area group (Bay Area, Statewide, Nationwide)
  static const _otherAreaIds = ['bay-area', 'statewide', 'nationwide'];

  int get filterCount {
    // Count counties as individual filters, but "Other" (bay-area, statewide, nationwide) as 1
    final countyCount = areas.where((id) => !_otherAreaIds.contains(id)).length;
    final hasOther = areas.any((id) => _otherAreaIds.contains(id));
    final areaCount = countyCount + (hasOther ? 1 : 0);

    return categories.length + groups.length + areaCount +
        (searchQuery.isNotEmpty ? 1 : 0);
  }
}

class FilterPreset {
  final String id;
  final String name;
  final FilterState filters;
  final String createdAt;

  FilterPreset({
    required this.id,
    required this.name,
    required this.filters,
    required this.createdAt,
  });

  factory FilterPreset.fromJson(Map<String, dynamic> json) {
    final filtersJson = json['filters'] as Map<String, dynamic>;
    return FilterPreset(
      id: json['id'] as String,
      name: json['name'] as String,
      filters: FilterState(
        categories: List<String>.from(filtersJson['categories'] ?? []),
        groups: List<String>.from(filtersJson['groups'] ?? filtersJson['eligibility'] ?? []),
        areas: List<String>.from(filtersJson['areas'] ?? []),
        searchQuery: filtersJson['searchQuery'] as String? ?? '',
      ),
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'filters': {
        'categories': filters.categories,
        'groups': filters.groups,
        'areas': filters.areas,
        'searchQuery': filters.searchQuery,
      },
      'createdAt': createdAt,
    };
  }
}

/// Result from AI-powered search
class AISearchResult {
  final String message;
  final List<Program> programs;

  AISearchResult({
    required this.message,
    required this.programs,
  });
}

/// Types of crisis situations detected in queries
enum CrisisType {
  emergency, // Call 911
  mentalHealth, // Call 988 Suicide & Crisis Lifeline
}

/// User profile for personalized recommendations
class UserProfile {
  final String id;
  final String name;
  final String relationship;
  final int colorIndex;
  final List<String> eligibilityGroups;
  final String? county;
  final DateTime createdAt;

  UserProfile({
    required this.id,
    required this.name,
    required this.relationship,
    required this.colorIndex,
    this.eligibilityGroups = const [],
    this.county,
    required this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      relationship: json['relationship'] as String,
      colorIndex: json['colorIndex'] as int,
      eligibilityGroups: List<String>.from(json['eligibilityGroups'] ?? []),
      county: json['county'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'relationship': relationship,
      'colorIndex': colorIndex,
      'eligibilityGroups': eligibilityGroups,
      'county': county,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? name,
    String? relationship,
    int? colorIndex,
    List<String>? eligibilityGroups,
    String? county,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      relationship: relationship ?? this.relationship,
      colorIndex: colorIndex ?? this.colorIndex,
      eligibilityGroups: eligibilityGroups ?? this.eligibilityGroups,
      county: county ?? this.county,
      createdAt: createdAt,
    );
  }

  /// Available relationship types
  static const List<String> relationshipTypes = [
    'Self',
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Aunt/Uncle',
    'Niece/Nephew',
    'Cousin',
    'Friend',
    'Other',
  ];

  /// Profile color options (Material Design palette)
  static const List<int> profileColors = [
    0xFF2196F3, // Blue
    0xFF4CAF50, // Green
    0xFFF44336, // Red
    0xFF9C27B0, // Purple
    0xFFFF9800, // Orange
    0xFF00BCD4, // Cyan
    0xFFE91E63, // Pink
    0xFF795548, // Brown
    0xFF607D8B, // Blue Grey
    0xFF009688, // Teal
  ];
}
