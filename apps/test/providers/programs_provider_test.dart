import 'package:flutter_test/flutter_test.dart';
import 'package:baynavigator/providers/programs_provider.dart';
import 'package:baynavigator/models/program.dart';

void main() {
  group('ProgramsProvider', () {
    late ProgramsProvider provider;

    setUp(() {
      provider = ProgramsProvider();
    });

    test('initial state is empty', () {
      expect(provider.programs, isEmpty);
      expect(provider.categories, isEmpty);
      expect(provider.groups, isEmpty);
      expect(provider.areas, isEmpty);
      expect(provider.favorites, isEmpty);
      expect(provider.isLoading, false);
      expect(provider.error, isNull);
    });

    test('filterState is empty by default', () {
      expect(provider.filterState.categories, isEmpty);
      expect(provider.filterState.groups, isEmpty);
      expect(provider.filterState.areas, isEmpty);
      expect(provider.filterState.searchQuery, '');
      expect(provider.filterState.hasFilters, false);
    });

    test('sortOption defaults to recentlyVerified', () {
      expect(provider.sortOption, SortOption.recentlyVerified);
    });

    test('setSearchQuery updates filter state', () {
      provider.setSearchQuery('food');
      expect(provider.filterState.searchQuery, 'food');
    });

    test('setSearchQuery clears with empty string', () {
      provider.setSearchQuery('test');
      provider.setSearchQuery('');
      expect(provider.filterState.searchQuery, '');
    });

    test('toggleCategory adds category', () {
      provider.toggleCategory('food');
      expect(provider.filterState.categories, contains('food'));
    });

    test('toggleCategory removes category when already present', () {
      provider.toggleCategory('food');
      provider.toggleCategory('food');
      expect(provider.filterState.categories, isNot(contains('food')));
    });

    test('toggleGroup adds group', () {
      provider.toggleGroup('seniors');
      expect(provider.filterState.groups, contains('seniors'));
    });

    test('toggleGroup removes group when already present', () {
      provider.toggleGroup('seniors');
      provider.toggleGroup('seniors');
      expect(provider.filterState.groups, isNot(contains('seniors')));
    });

    test('toggleArea adds area', () {
      provider.toggleArea('san-francisco');
      expect(provider.filterState.areas, contains('san-francisco'));
    });

    test('toggleArea removes area when already present', () {
      provider.toggleArea('san-francisco');
      provider.toggleArea('san-francisco');
      expect(provider.filterState.areas, isNot(contains('san-francisco')));
    });

    test('toggleOtherAreas adds all other area IDs', () {
      provider.toggleOtherAreas();
      expect(provider.filterState.areas, contains('bay-area'));
      expect(provider.filterState.areas, contains('statewide'));
      expect(provider.filterState.areas, contains('nationwide'));
    });

    test('toggleOtherAreas removes all other area IDs when present', () {
      provider.toggleOtherAreas();
      provider.toggleOtherAreas();
      expect(provider.filterState.areas, isNot(contains('bay-area')));
      expect(provider.filterState.areas, isNot(contains('statewide')));
      expect(provider.filterState.areas, isNot(contains('nationwide')));
    });

    test('clearFilters resets all filters', () {
      provider.setSearchQuery('test');
      provider.toggleCategory('food');
      provider.toggleGroup('seniors');
      provider.toggleArea('sf');

      provider.clearFilters();

      expect(provider.filterState.searchQuery, '');
      expect(provider.filterState.categories, isEmpty);
      expect(provider.filterState.groups, isEmpty);
      expect(provider.filterState.areas, isEmpty);
    });

    test('setSortOption changes sort order', () {
      provider.setSortOption(SortOption.nameAsc);
      expect(provider.sortOption, SortOption.nameAsc);

      provider.setSortOption(SortOption.nameDesc);
      expect(provider.sortOption, SortOption.nameDesc);
    });

    test('applyFilterPreset applies preset filters', () {
      final preset = FilterPreset(
        id: '1',
        name: 'Test Preset',
        filters: FilterState(
          categories: ['food', 'health'],
          groups: ['seniors'],
          searchQuery: 'free',
        ),
        createdAt: '2024-01-01',
      );

      provider.applyFilterPreset(preset);

      expect(provider.filterState.categories, ['food', 'health']);
      expect(provider.filterState.groups, ['seniors']);
      expect(provider.filterState.searchQuery, 'free');
    });

    test('isFavorite returns false for non-favorite', () {
      expect(provider.isFavorite('some-id'), false);
    });

    test('otherAreaIds contains expected values', () {
      expect(ProgramsProvider.otherAreaIds, contains('bay-area'));
      expect(ProgramsProvider.otherAreaIds, contains('statewide'));
      expect(ProgramsProvider.otherAreaIds, contains('nationwide'));
      expect(ProgramsProvider.otherAreaIds.length, 3);
    });
  });

  group('SortOption', () {
    test('all sort options are defined', () {
      expect(SortOption.values.length, 5);
      expect(SortOption.values, contains(SortOption.recentlyVerified));
      expect(SortOption.values, contains(SortOption.nameAsc));
      expect(SortOption.values, contains(SortOption.nameDesc));
      expect(SortOption.values, contains(SortOption.categoryAsc));
      expect(SortOption.values, contains(SortOption.distanceAsc));
    });
  });
}
